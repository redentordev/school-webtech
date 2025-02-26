import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateUploadURL } from '@/lib/s3';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { ObjectId } from 'mongodb';

// POST endpoint to get a presigned URL for uploading a profile image
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileType } = await request.json();
    
    if (!fileType || !fileType.startsWith('image/')) {
      return NextResponse.json(
        { message: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Generate a presigned URL for uploading the image to S3
    const { uploadURL, key } = await generateUploadURL(fileType, 'profile-images');

    return NextResponse.json({ uploadURL, key }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update the user's profile image key in the database
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageKey } = await request.json();
    
    if (!imageKey) {
      return NextResponse.json(
        { message: 'Image key is required' },
        { status: 400 }
      );
    }

    console.log(`Updating profile image for user: ${session.user.email}`);
    console.log(`Image key: ${imageKey}`);

    // Connect to the database
    await dbConnect();
    
    // Find the user by email
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      console.error(`User not found with email: ${session.user.email}`);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`Found user: ${user._id}, current imageKey: ${user.imageKey || 'none'}`);

    // Update the user's profile image key
    user.imageKey = imageKey;
    
    // Also update the image field for NextAuth compatibility
    user.image = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/images/${encodeURIComponent(imageKey)}`;
    
    await user.save();
    console.log(`User updated with new imageKey: ${imageKey}`);

    // Get the updated user
    const updatedUser = await User.findOne({ email: session.user.email })
      .select('-password -__v');

    if (!updatedUser) {
      console.error('Failed to retrieve updated user');
      return NextResponse.json(
        { message: 'Failed to retrieve updated user' },
        { status: 500 }
      );
    }

    console.log('Profile image updated successfully');
    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating profile image:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update profile image' },
      { status: 500 }
    );
  }
} 