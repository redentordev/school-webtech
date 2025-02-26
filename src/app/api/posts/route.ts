import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import { getPublicURL } from '@/lib/s3';
import mongoose from 'mongoose';

// Define a type that includes possible user ID fields
type UserWithId = {
  id?: string;
  _id?: string;
  sub?: string;
  email?: string;
  [key: string]: any;
};

// Create a new post
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

    console.log('Session user:', JSON.stringify(session.user));

    // Get post data from request body
    const { caption, imageKey } = await request.json();
    
    if (!imageKey) {
      return NextResponse.json(
        { message: 'Image is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the public URL for the image
    const imageUrl = getPublicURL(imageKey);

    // Use type assertion with a more specific type
    const user = session.user as UserWithId;
    
    // Try to find the user in the database first to ensure we have the correct MongoDB ID
    const dbUser = await mongoose.model('User').findOne({ 
      $or: [
        { _id: user.id },
        { email: user.email }
      ]
    });
    
    if (!dbUser) {
      console.error('User not found in database:', user);
      return NextResponse.json(
        { message: 'User not found in database' },
        { status: 404 }
      );
    }
    
    console.log('Found user in database:', {
      dbUserId: dbUser._id.toString(),
      sessionUserId: user.id,
      email: dbUser.email
    });

    // Use the database user ID for consistency
    const post = await Post.create({
      user: dbUser._id,
      caption,
      imageUrl,
      imageKey,
      likes: [],
      comments: []
    });

    // Populate the user field for the response
    await post.populate('user', 'name username image');

    return NextResponse.json(
      { message: 'Post created successfully', post },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}

// Get all posts
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

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get posts with pagination
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username image imageKey')
      .populate({
        path: 'comments.user',
        select: 'name username image imageKey'
      });

    const total = await Post.countDocuments();

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
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
} 