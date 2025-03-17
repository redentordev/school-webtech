import mongoose from "mongoose";
import { logError, ErrorSeverity, ErrorSource, handleMongoDBError } from './error-utils';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  const error = {
    message: "Please define the MONGODB_URI environment variable inside .env.local",
    source: ErrorSource.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    code: 'DB_MISSING_URI',
    timestamp: new Date().toISOString()
  };
  logError(error);
  throw new Error(error.message);
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// Define the type for our cached mongoose connection
interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global variable with proper type
// @ts-ignore
let cached: Cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  // @ts-ignore
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Add TLS options to match the MongoDB client configuration
      // This helps resolve SSL/TLS handshake issues in production
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: process.env.NODE_ENV === 'production',
      // Don't add any conflicting options
    };

    // Log connection attempt
    logError({
      message: "Attempting to connect to MongoDB with Mongoose",
      source: ErrorSource.DATABASE,
      severity: ErrorSeverity.INFO,
      details: {
        environment: process.env.NODE_ENV,
        usingTLS: opts.tls,
      },
      timestamp: new Date().toISOString()
    });

    cached.promise = mongoose.connect(MONGODB_URI!, opts)
      .then((mongoose) => {
        logError({
          message: "Successfully connected to MongoDB with Mongoose",
          source: ErrorSource.DATABASE,
          severity: ErrorSeverity.INFO,
          timestamp: new Date().toISOString()
        });
        return mongoose;
      })
      .catch((error) => {
        // Log connection error
        const appError = handleMongoDBError(error, "mongoose.connect");
        logError(appError);
        throw error;
      });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: any) {
    cached.promise = null;
    const appError = handleMongoDBError(error, "dbConnect cached.promise");
    logError(appError);
    throw error;
  }
}

export default dbConnect; 