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