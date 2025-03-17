import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { generateUploadURL } from '@/lib/s3';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createErrorResponse, ErrorSeverity, ErrorSource, logError } from '@/lib/error-utils';

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return createErrorResponse(
        {
          message: 'Unauthorized',
          source: ErrorSource.AUTH,
          severity: ErrorSeverity.WARNING,
          code: 'AUTH_UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    // Get file type from request body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return createErrorResponse(
        {
          message: 'Invalid request body',
          source: ErrorSource.VALIDATION,
          severity: ErrorSeverity.WARNING,
          code: 'VALIDATION_INVALID_JSON',
          details: { error: parseError.message },
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const { fileType } = body;
    
    if (!fileType) {
      return createErrorResponse(
        {
          message: 'File type is required',
          source: ErrorSource.VALIDATION,
          severity: ErrorSeverity.WARNING,
          code: 'VALIDATION_MISSING_FILE_TYPE',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    try {
      // Generate presigned URL
      const { uploadURL, key } = await generateUploadURL(fileType, 'posts');

      // Log success
      logError({
        message: 'Generated upload URL for post image',
        source: ErrorSource.S3_STORAGE,
        severity: ErrorSeverity.INFO,
        details: {
          userId: session.user.id,
          fileType,
          key,
        },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ uploadURL, key }, { status: 200 });
    } catch (s3Error: any) {
      // S3 errors are already logged in the s3.ts functions
      return createErrorResponse(
        {
          message: s3Error.message || 'Failed to generate upload URL',
          source: ErrorSource.S3_STORAGE,
          severity: ErrorSeverity.ERROR,
          code: 'S3_UPLOAD_URL_FAILED',
          details: {
            fileType,
            errorMessage: s3Error.message,
          },
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  } catch (error: any) {
    // Catch-all for unexpected errors
    return createErrorResponse(
      {
        message: error.message || 'Failed to generate upload URL',
        source: ErrorSource.API,
        severity: ErrorSeverity.ERROR,
        code: 'API_UNKNOWN_ERROR',
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