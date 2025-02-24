import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import Post from '@/models/Post';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { image, caption } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const post = await Post.create({
      user: session.user.id,
      image,
      caption,
    });

    await post.populate('user', 'name username profilePicture');

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error('Post creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const posts = await Post.find()
      .populate('user', 'name username profilePicture')
      .populate('comments.user', 'name username profilePicture')
      .sort({ createdAt: -1 });

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Posts fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 