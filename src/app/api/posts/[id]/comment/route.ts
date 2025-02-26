import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const postId = (await params).id;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    // Get comment text from request body
    const { text } = await request.json();
    
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { message: 'Comment text is required' },
        { status: 400 }
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

    // Add comment to post
    const newComment = {
      user: userId,
      text: text.trim(),
      createdAt: new Date()
    };
    
    post.comments.push(newComment);
    await post.save();

    // Populate user info for the new comment
    const populatedPost = await Post.findById(postId)
      .populate('comments.user', 'name username image');

    // Get the newly added comment
    const addedComment = populatedPost.comments[populatedPost.comments.length - 1];

    return NextResponse.json({
      message: 'Comment added successfully',
      comment: addedComment
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
} 