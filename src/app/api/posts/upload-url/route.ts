import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { generateUploadURL } from '@/lib/s3';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get file type from request body
    const { fileType } = await request.json();
    
    if (!fileType) {
      return NextResponse.json(
        { message: 'File type is required' },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const { uploadURL, key } = await generateUploadURL(fileType);

    return NextResponse.json({ uploadURL, key }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 