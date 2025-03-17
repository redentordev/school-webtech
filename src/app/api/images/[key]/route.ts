import { NextResponse } from 'next/server';
import { generateViewURL } from '@/lib/s3';
import { createErrorResponse, ErrorSeverity, ErrorSource } from '@/lib/error-utils';

// Simple server-side cache to avoid regenerating URLs for the same keys
const urlCache = new Map<string, { url: string, timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const key = (await params).key;
    
    if (!key) {
      return createErrorResponse(
        { 
          message: 'Image key is required',
          source: ErrorSource.API,
          severity: ErrorSeverity.WARNING,
          code: 'API_MISSING_PARAM',
          details: { params },
          timestamp: new Date().toISOString()
        },
        400
      );
    }

    // Decode the key if it's URL encoded
    const decodedKey = decodeURIComponent(key);
    
    // Check cache first
    const now = Date.now();
    const cachedUrl = urlCache.get(decodedKey);
    
    if (cachedUrl && (now - cachedUrl.timestamp < CACHE_DURATION)) {
      return NextResponse.json(
        { url: cachedUrl.url }, 
        { 
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=3600',
            'Expires': new Date(now + CACHE_DURATION).toUTCString()
          }
        }
      );
    }
    
    // Generate a presigned URL for viewing the image
    try {
      const url = await generateViewURL(decodedKey);
      
      if (!url) {
        return createErrorResponse(
          {
            message: 'Failed to generate image URL',
            source: ErrorSource.S3_STORAGE,
            severity: ErrorSeverity.ERROR,
            code: 'S3_URL_GENERATION_FAILED',
            details: { key: decodedKey },
            timestamp: new Date().toISOString()
          },
          500
        );
      }
      
      // Cache the URL
      urlCache.set(decodedKey, { url, timestamp: now });
      
      // Set moderate caching headers - private cache, 1 hour max age
      return NextResponse.json(
        { url }, 
        { 
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=3600',
            'Expires': new Date(now + CACHE_DURATION).toUTCString()
          }
        }
      );
    } catch (s3Error: any) {
      // S3 errors are already logged in the s3.ts functions
      return createErrorResponse(
        {
          message: 'S3 error generating image URL',
          source: ErrorSource.S3_STORAGE,
          severity: ErrorSeverity.ERROR,
          code: s3Error.code || 'S3_ERROR',
          details: {
            key: decodedKey,
            errorName: s3Error.name,
            errorMessage: s3Error.message,
            errorCode: s3Error.code
          },
          timestamp: new Date().toISOString()
        },
        500
      );
    }
  } catch (error: any) {
    // Catch-all for unexpected errors
    return createErrorResponse(
      {
        message: error.message || 'Failed to generate view URL',
        source: ErrorSource.API,
        severity: ErrorSeverity.ERROR,
        code: 'API_UNKNOWN_ERROR',
        details: {
          errorType: error.constructor.name,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      },
      500
    );
  }
} 