import { NextResponse } from 'next/server';
import { generateViewURL } from '@/lib/s3';

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
      console.error('Image key is missing in request');
      return NextResponse.json(
        { message: 'Image key is required' },
        { status: 400 }
      );
    }

    // Decode the key if it's URL encoded
    const decodedKey = decodeURIComponent(key);
    
    // Check cache first
    const now = Date.now();
    const cachedUrl = urlCache.get(decodedKey);
    
    if (cachedUrl && (now - cachedUrl.timestamp < CACHE_DURATION)) {
      console.log(`Using cached URL for key: ${decodedKey} (server cache)`);
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
    
    console.log(`Generating view URL for image key: ${decodedKey}`);
    
    // Generate a presigned URL for viewing the image
    try {
      const url = await generateViewURL(decodedKey);
      
      if (!url) {
        console.error('Failed to generate URL for key:', decodedKey);
        return NextResponse.json(
          { message: 'Failed to generate image URL', key: decodedKey },
          { status: 500 }
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
      console.error('Error from S3 service:', s3Error);
      
      // Return a more detailed error response
      return NextResponse.json(
        { 
          message: 'S3 error generating image URL', 
          key: decodedKey,
          errorName: s3Error.name,
          errorMessage: s3Error.message,
          errorCode: s3Error.code || 'UNKNOWN'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating view URL:', error);
    return NextResponse.json(
      { 
        message: error.message || 'Failed to generate view URL',
        errorType: error.constructor.name
      },
      { status: 500 }
    );
  }
} 