import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Follow from '@/models/Follow';

// Follow a user
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

    const followerId = session.user.id;
    
    if (!followerId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    // Get user ID to follow from request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID to follow is required' },
        { status: 400 }
      );
    }

    // Prevent following yourself
    if (followerId === userId) {
      return NextResponse.json(
        { message: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create follow relationship
    const follow = await Follow.create({
      follower: followerId,
      following: userId
    });

    return NextResponse.json(
      { message: 'User followed successfully', follow },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle duplicate key error (already following)
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'You are already following this user' },
        { status: 400 }
      );
    }

    console.error('Error following user:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to follow user' },
      { status: 500 }
    );
  }
}

// Unfollow a user
export async function DELETE(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const followerId = session.user.id;
    
    if (!followerId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    // Get user ID to unfollow from URL
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID to unfollow is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Delete follow relationship
    const result = await Follow.findOneAndDelete({
      follower: followerId,
      following: userId
    });

    if (!result) {
      return NextResponse.json(
        { message: 'You are not following this user' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'User unfollowed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to unfollow user' },
      { status: 500 }
    );
  }
} 