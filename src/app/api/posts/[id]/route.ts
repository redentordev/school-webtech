import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { deleteObject } from '@/lib/s3';
import Post from '@/models/Post';

// GET: Fetch a specific post by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited if it's a Promise
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    const post = await Post.findById(id).populate('user');
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PUT: Update a post
export async function PUT(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Ensure params is awaited if it's a Promise
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Get the existing post
    const existingPost = await Post.findById(id);
    
    if (!existingPost) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Debug logging for ownership verification
    console.log('Post user ID:', existingPost.user?.toString());
    console.log('Session user ID:', session.user.id);
    
    // Verify ownership - add null check for userId
    if (!existingPost.user || existingPost.user.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'You can only edit your own posts' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Only allow updating caption for now
    if (!data.caption && data.caption !== '') {
      return NextResponse.json(
        { message: 'Caption is required' },
        { status: 400 }
      );
    }
    
    // Update the post
    existingPost.caption = data.caption;
    existingPost.updatedAt = new Date();
    
    await existingPost.save();
    
    return NextResponse.json({
      message: 'Post updated successfully',
      id,
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a post
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Ensure params is awaited if it's a Promise
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Get the existing post
    const existingPost = await Post.findById(id);
    
    if (!existingPost) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Debug logging for ownership verification
    console.log('Post user ID:', existingPost.user?.toString());
    console.log('Session user ID:', session.user.id);
    
    // Verify ownership - add null check for userId
    if (!existingPost.user || existingPost.user.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }
    
    // Delete the post
    await Post.findByIdAndDelete(id);
    
    // Delete the image from S3 if it exists
    if (existingPost.imageKey) {
      try {
        await deleteObject(existingPost.imageKey);
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error);
        // Continue with post deletion even if S3 delete fails
      }
    }
    
    return NextResponse.json({
      message: 'Post deleted successfully',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
} 