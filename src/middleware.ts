import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global middleware for the application
 * - Adds a unique request ID for tracking errors across the system
 * - Adds basic logging to track API requests
 * - Could be expanded to include rate limiting, CORS, etc.
 */
export async function middleware(request: NextRequest) {
  // Skip middleware for static files and non-API routes if needed
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.') // Static files usually have extensions
  ) {
    return NextResponse.next();
  }

  // Generate a unique ID for this request
  const requestId = uuidv4();
  
  // Store in process variable for access in API routes
  // This will be available in serverLogger and error-utils
  if (typeof process !== 'undefined') {
    (process as any).requestId = requestId;
  }

  // Start timestamp for request duration tracking
  const requestStartTime = Date.now();

  // Log basic request info
  if (request.nextUrl.pathname.startsWith('/api')) {
    console.log(`[REQUEST] ${request.method} ${request.nextUrl.pathname} - ID: ${requestId}`);
  }

  // Process the request
  const response = NextResponse.next();

  // Add the request ID to response headers for client-side tracking
  response.headers.set('X-Request-ID', requestId);

  // For API routes, add basic response logging
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Note: In the actual middleware we can't access the status code as it hasn't been generated yet
    // This would need to be handled by a response handler in the API routes
    response.headers.set('X-Response-Time', `${Date.now() - requestStartTime}ms`);
  }

  return response;
}

// Configure middleware to run only on API routes
// You could expand this to other routes as needed
export const config = {
  matcher: [
    '/api/:path*',
    // Add other paths as needed
  ],
}; 