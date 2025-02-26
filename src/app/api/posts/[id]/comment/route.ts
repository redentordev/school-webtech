import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import mongoose from 'mongoose';

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

    let userId = session.user.id;
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
    
    // Verify the user ID exists in the database
    try {
      const User = mongoose.model('User');
      
      // Find the user in the database to ensure we have the correct MongoDB ID
      const dbUser = await User.findOne({ 
        $or: [
          { _id: userId },
          { email: session.user.email }
        ]
      });
      
      if (!dbUser) {
        console.error('User not found in database:', {
          sessionUserId: userId,
          sessionUserEmail: session.user.email
        });
        return NextResponse.json(
          { message: 'User not found in database' },
          { status: 404 }
        );
      }
      
      console.log('Found user in database for comment:', {
        dbUserId: dbUser._id.toString(),
        sessionUserId: userId,
        email: dbUser.email
      });
      
      // Use the database user ID for the comment
      userId = dbUser._id.toString();
    } catch (userError) {
      console.error('Error checking user existence:', userError);
      // Continue anyway since we have a userId from the session
    }

    // Add comment to post
    const newComment = {
      user: userId,
      text: text.trim(),
      content: text.trim(),
      createdAt: new Date(),
      _id: new mongoose.Types.ObjectId()
    };
    
    console.log('Adding new comment:', newComment);
    
    // Ensure all existing comments have the required text field
    if (post.comments && Array.isArray(post.comments)) {
      post.comments = post.comments.map((comment: any) => {
        // If comment is a Mongoose document with toObject method
        if (comment && typeof comment.toObject === 'function') {
          const commentObj = comment.toObject();
          return {
            ...commentObj,
            text: commentObj.text || commentObj.content || 'No text',
          };
        }
        // If comment is a plain object
        return {
          ...comment,
          text: comment.text || comment.content || 'No text',
        };
      });
    }
    
    // Add the new comment
    post.comments.push(newComment);
    
    try {
      await post.save();
    } catch (saveError: any) {
      console.error('Error saving post with new comment:', saveError);
      
      // If validation error, try to fix and save again
      if (saveError.name === 'ValidationError') {
        console.log('Attempting to fix validation errors and save again...');
        
        // More aggressive fix for comments
        post.comments = post.comments.map((comment: any) => {
          const commentObj = comment.toObject ? comment.toObject() : comment;
          return {
            _id: commentObj._id || new mongoose.Types.ObjectId(),
            user: commentObj.user || userId,
            text: commentObj.text || commentObj.content || 'No text',
            createdAt: commentObj.createdAt || new Date()
          };
        });
        
        // Try saving again
        await post.save();
      } else {
        // If not a validation error, rethrow
        throw saveError;
      }
    }

    // Populate user info for the new comment with all required fields
    const populatedPost = await Post.findById(postId)
      .populate({
        path: 'comments.user',
        select: 'name username image imageKey _id'
      });

    // Get the newly added comment
    const addedComment = populatedPost.comments[populatedPost.comments.length - 1];
    
    console.log('Populated comment to return:', JSON.stringify(addedComment));
    
    // Make sure the user field is properly structured
    let commentToReturn;
    try {
      // If addedComment is a Mongoose document, use toObject()
      if (addedComment && typeof addedComment.toObject === 'function') {
        const commentObj = addedComment.toObject();
        commentToReturn = {
          ...commentObj,
          user: commentObj.user && typeof commentObj.user.toObject === 'function'
            ? commentObj.user.toObject()
            : commentObj.user
        };
      } else {
        // Handle case where addedComment is not a Mongoose document
        commentToReturn = {
          ...addedComment,
          _id: addedComment._id?.toString() || new mongoose.Types.ObjectId().toString(),
          user: addedComment.user || userId, // Fallback to userId if user is null
          text: addedComment.text || text.trim(),
          content: addedComment.content || text.trim(),
          createdAt: addedComment.createdAt || new Date()
        };
      }
    } catch (formatError) {
      console.error('Error formatting comment data:', formatError);
      // Create a minimal valid comment object
      commentToReturn = {
        _id: new mongoose.Types.ObjectId().toString(),
        user: userId,
        text: text.trim(),
        content: text.trim(),
        createdAt: new Date()
      };
    }
    
    console.log('Final comment to return:', JSON.stringify(commentToReturn));

    return NextResponse.json({
      message: 'Comment added successfully',
      comment: commentToReturn
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    // More detailed logging for validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      
      // Try to determine if we're having a text/content mismatch
      if (error.errors && error.errors['comments']) {
        console.error('Comment validation issues:', error.errors['comments']);
      }
    }
    
    return NextResponse.json(
      { message: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
} 