'use client';

import { ErrorSource } from './error-utils';
import { ClientError } from '@/contexts/ErrorContext';

/**
 * Report a client-side error to the server for logging
 * This allows client errors to be captured in the server logs
 */
export async function reportErrorToServer(error: ClientError): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Client Error]', error);
  }

  try {
    // Only send the error to the server in production to avoid flooding logs during development
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          source: error.source,
          details: error.details,
          clientTimestamp: error.timestamp.toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    }
  } catch (e) {
    // If reporting fails, log locally but don't disrupt the user
    console.error('Failed to report error to server:', e);
  }
}

/**
 * Wrap a function with error handling
 * @param fn The function to wrap
 * @param errorHandler Optional custom error handler
 * @returns The wrapped function
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: Error) => void
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      const clientError: ClientError = {
        message: error.message || 'An unknown error occurred',
        source: ErrorSource.CLIENT,
        timestamp: new Date(),
        details: {
          stack: error.stack,
          name: error.name,
        },
      };

      // Report to server
      reportErrorToServer(clientError);

      // Allow custom handling
      if (errorHandler) {
        errorHandler(error);
      }

      throw error;
    }
  };
}

/**
 * Create an API route endpoint for logging client-side errors
 * This should be added at /api/log-error/route.ts
 */
export const createLogErrorAPIRoute = `
import { NextResponse } from 'next/server';
import { logError, ErrorSeverity, ErrorSource } from '@/lib/error-utils';

export async function POST(request: Request) {
  try {
    const errorData = await request.json();
    
    // Log the client error on the server
    logError({
      message: errorData.message || 'Client error',
      source: ErrorSource.CLIENT,
      severity: ErrorSeverity.ERROR,
      details: {
        ...errorData.details,
        clientUrl: errorData.url,
        userAgent: errorData.userAgent,
        clientTimestamp: errorData.clientTimestamp,
      },
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error logging client error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
`; 