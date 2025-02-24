import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import Post from '@/models/Post';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const post = await Post.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const userLiked = post.likes.includes(session.user.id);

    if (userLiked) {
      post.likes = post.likes.filter(
        (id: string) => id.toString() !== session.user.id
      );
    } else {
      post.likes.push(session.user.id);
    }

    await post.save();

    return NextResponse.json({ likes: post.likes });
  } catch (error: any) {
    console.error('Post like error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 