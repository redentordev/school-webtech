import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { createErrorResponse, ErrorSeverity, ErrorSource, logError, handleMongoDBError } from "@/lib/error-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return createErrorResponse(
        {
          message: "Missing required fields",
          source: ErrorSource.VALIDATION,
          severity: ErrorSeverity.WARNING,
          code: "VALIDATION_MISSING_FIELDS",
          details: {
            missingName: !name,
            missingEmail: !email,
            missingPassword: !password,
          },
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse(
        {
          message: "Invalid email format",
          source: ErrorSource.VALIDATION,
          severity: ErrorSeverity.WARNING,
          code: "VALIDATION_INVALID_EMAIL",
          details: { email },
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Validate password length
    if (password.length < 8) {
      return createErrorResponse(
        {
          message: "Password must be at least 8 characters long",
          source: ErrorSource.VALIDATION,
          severity: ErrorSeverity.WARNING,
          code: "VALIDATION_WEAK_PASSWORD",
          details: { passwordLength: password.length },
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    try {
      await dbConnect();
    } catch (dbError: any) {
      // Database connection errors are logged in dbConnect
      return createErrorResponse(
        {
          message: "Database connection failed",
          source: ErrorSource.DATABASE,
          severity: ErrorSeverity.CRITICAL,
          code: "DB_CONNECTION_FAILED",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return createErrorResponse(
          {
            message: "Email already in use",
            source: ErrorSource.AUTH,
            severity: ErrorSeverity.WARNING,
            code: "AUTH_EMAIL_IN_USE",
            details: { email },
            timestamp: new Date().toISOString(),
          },
          409
        );
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password, // Will be hashed by the mongoose pre-save hook
      });

      // Log successful registration
      logError({
        message: "User registered successfully",
        source: ErrorSource.AUTH,
        severity: ErrorSeverity.INFO,
        details: {
          userId: user._id.toString(),
          email: user.email,
        },
        timestamp: new Date().toISOString(),
      });

      // Don't return the password
      const userWithoutPassword = {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return NextResponse.json(
        { user: userWithoutPassword, message: "User registered successfully" },
        { status: 201 }
      );
    } catch (dbOperationError: any) {
      const appError = handleMongoDBError(dbOperationError, "user registration");
      return createErrorResponse(appError, 500);
    }
  } catch (error: any) {
    // Catch-all for unexpected errors
    return createErrorResponse(
      {
        message: "An error occurred during registration",
        source: ErrorSource.API,
        severity: ErrorSeverity.ERROR,
        code: "API_REGISTRATION_FAILED",
        details: {
          errorMessage: error.message,
          errorName: error.name,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
} 