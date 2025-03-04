import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import mongoose from 'mongoose';

// Get posts for the current user
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    await dbConnect();

    // Find the user in the database to ensure we have the correct MongoDB ID
    const dbUser = await mongoose.model('User').findOne({ 
      $or: [
        { _id: userId },
        { email: session.user.email }
      ]
    });
    
    if (!dbUser) {
      console.error('User not found in database:', session.user);
      return NextResponse.json(
        { message: 'User not found in database' },
        { status: 404 }
      );
    }

    console.log('Found user in database:', {
      dbUserId: dbUser._id.toString(),
      sessionUserId: userId,
      email: dbUser.email
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get posts with pagination using the database user ID
    const posts = await Post.find({ user: dbUser._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username image imageKey')
      .populate({
        path: 'comments.user',
        select: 'name username image imageKey _id'
      });

    const total = await Post.countDocuments({ user: dbUser._id });

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch user posts' },
      { status: 500 }
    );
  }
} 