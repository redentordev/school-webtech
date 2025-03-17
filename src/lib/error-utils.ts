import { NextResponse } from 'next/server';
import { serverLogger } from './logger';

// Error severity levels
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// Error sources/categories
export enum ErrorSource {
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  S3_STORAGE = 'S3_STORAGE',
  API = 'API',
  CLIENT = 'CLIENT',
  VALIDATION = 'VALIDATION',
}

// Error object structure
export interface AppError {
  message: string;
  source: ErrorSource;
  severity: ErrorSeverity;
  code?: string;
  details?: any;
  timestamp: string;
  path?: string;
  userId?: string;
  requestId?: string;
}

/**
 * Log an error to the console with standardized format
 */
export function logError(error: AppError): void {
  const formattedError = {
    ...error,
    timestamp: error.timestamp || new Date().toISOString(),
  };

  // Use the enhanced serverLogger when available
  if (typeof serverLogger === 'function') {
    serverLogger(formattedError);
    return;
  }

  // Fall back to basic console logging if serverLogger is not available
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error(`[CRITICAL][${error.source}] ${error.message}`, formattedError);
      break;
    case ErrorSeverity.ERROR:
      console.error(`[ERROR][${error.source}] ${error.message}`, formattedError);
      break;
    case ErrorSeverity.WARNING:
      console.warn(`[WARNING][${error.source}] ${error.message}`, formattedError);
      break;
    case ErrorSeverity.INFO:
      console.info(`[INFO][${error.source}] ${error.message}`, formattedError);
      break;
    default:
      console.log(`[LOG][${error.source}] ${error.message}`, formattedError);
  }
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  error: Error | AppError | string,
  status: number = 500,
  source: ErrorSource = ErrorSource.API
): NextResponse {
  const timestamp = new Date().toISOString();
  
  // Initialize error info
  let errorInfo: AppError;
  
  // Handle different error input types
  if (typeof error === 'string') {
    errorInfo = {
      message: error,
      source,
      severity: ErrorSeverity.ERROR,
      timestamp,
    };
  } else if ('source' in error && 'severity' in error) {
    // It's already an AppError
    errorInfo = {
      ...error,
      timestamp: error.timestamp || timestamp,
    };
  } else {
    // It's a standard Error
    errorInfo = {
      message: error.message || 'An unexpected error occurred',
      source,
      severity: ErrorSeverity.ERROR,
      code: (error as any).code,
      details: process.env.NODE_ENV !== 'production' ? (error as any) : undefined,
      timestamp,
    };
  }
  
  // Add request ID if available in process (for tracking related errors)
  if (typeof process !== 'undefined' && (process as any).requestId) {
    errorInfo.requestId = (process as any).requestId;
  }
  
  // Log the error
  logError(errorInfo);
  
  // Create a safe version for client response
  const clientResponse = {
    error: {
      message: errorInfo.message,
      code: errorInfo.code,
      source: errorInfo.source,
    }
  };
  
  return NextResponse.json(clientResponse, { status });
}

/**
 * Handle S3-specific errors
 */
export function handleS3Error(error: any, operation: string): AppError {
  let severity = ErrorSeverity.ERROR;
  let message = `S3 operation failed: ${operation}`;
  let code = error.code || 'UNKNOWN_S3_ERROR';
  
  // Determine severity and messages based on error type
  if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
    severity = ErrorSeverity.WARNING;
    message = `File not found in S3: ${operation}`;
    code = 'S3_FILE_NOT_FOUND';
  } else if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
    severity = ErrorSeverity.ERROR;
    message = `Access denied to S3 resource: ${operation}`;
    code = 'S3_ACCESS_DENIED';
  } else if (error.name === 'NetworkError' || error.$metadata?.httpStatusCode === 0) {
    severity = ErrorSeverity.CRITICAL;
    message = `Network error during S3 operation: ${operation}`;
    code = 'S3_NETWORK_ERROR';
  } else if (error.name === 'CredentialsError') {
    severity = ErrorSeverity.CRITICAL;
    message = `S3 credentials error: ${operation}`;
    code = 'S3_CREDENTIALS_ERROR';
  }
  
  return {
    message,
    code,
    source: ErrorSource.S3_STORAGE,
    severity,
    details: {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      metadata: error.$metadata,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle MongoDB-specific errors
 */
export function handleMongoDBError(error: any, operation: string): AppError {
  let severity = ErrorSeverity.ERROR;
  let message = `Database operation failed: ${operation}`;
  let code = error.code || 'UNKNOWN_DB_ERROR';
  
  // Common MongoDB error codes
  if (error.code === 11000) {
    severity = ErrorSeverity.WARNING;
    message = `Duplicate key error: ${operation}`;
    code = 'DB_DUPLICATE_KEY';
  } else if (error.name === 'ValidationError') {
    severity = ErrorSeverity.WARNING;
    message = `Database validation error: ${operation}`;
    code = 'DB_VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    severity = ErrorSeverity.WARNING;
    message = `Database cast error: ${operation}`;
    code = 'DB_CAST_ERROR';
  } else if (error.message?.includes('connect ECONNREFUSED')) {
    severity = ErrorSeverity.CRITICAL;
    message = `Database connection error: ${operation}`;
    code = 'DB_CONNECTION_ERROR';
  }
  
  return {
    message,
    code,
    source: ErrorSource.DATABASE,
    severity,
    details: {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle authentication-specific errors
 */
export function handleAuthError(error: any, operation: string): AppError {
  let severity = ErrorSeverity.ERROR;
  let message = `Authentication error: ${operation}`;
  let code = 'AUTH_ERROR';
  
  if (error.message?.includes('Invalid credentials')) {
    severity = ErrorSeverity.WARNING;
    message = `Invalid login credentials: ${operation}`;
    code = 'AUTH_INVALID_CREDENTIALS';
  } else if (error.message?.includes('token')) {
    severity = ErrorSeverity.WARNING;
    message = `Invalid or expired token: ${operation}`;
    code = 'AUTH_INVALID_TOKEN';
  } else if (error.message?.includes('OAuthAccountNotLinked')) {
    severity = ErrorSeverity.WARNING;
    message = `OAuth account not linked: ${operation}`;
    code = 'AUTH_OAUTH_NOT_LINKED';
  } else if (error.message?.includes('User not found')) {
    severity = ErrorSeverity.WARNING;
    message = `User not found: ${operation}`;
    code = 'AUTH_USER_NOT_FOUND';
  }
  
  return {
    message,
    code,
    source: ErrorSource.AUTH,
    severity,
    details: {
      errorName: error.name,
      errorMessage: error.message,
    },
    timestamp: new Date().toISOString(),
  };
} 