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

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
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

    post.comments.push({
      user: session.user.id,
      text,
    });

    await post.save();

    // Populate the newly added comment with user details
    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'name username profilePicture');

    const newComment = populatedPost.comments[populatedPost.comments.length - 1];

    return NextResponse.json(newComment, { status: 201 });
  } catch (error: any) {
    console.error('Comment creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 