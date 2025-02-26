import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const postId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    await dbConnect();

    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user already liked the post
    const alreadyLiked = post.likes.includes(userId);
    
    if (alreadyLiked) {
      // Unlike the post
      post.likes = post.likes.filter((id: string) => id.toString() !== userId);
    } else {
      // Like the post
      post.likes.push(userId);
    }
    
    await post.save();

    return NextResponse.json({
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
      liked: !alreadyLiked,
      likesCount: post.likes.length
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error liking/unliking post:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to like/unlike post' },
      { status: 500 }
    );
  }
} 