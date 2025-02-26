import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import Follow from '@/models/Follow';
import mongoose from 'mongoose';

// Define types for comments and users
interface CommentUser {
  _id: string;
  name: string;
  username?: string;
  image?: string;
  imageKey?: string;
}

interface Comment {
  _id: string;
  user: CommentUser | string;
  text: string;
  content?: string;
  createdAt: string;
}

// Get posts for the feed
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!(session && session.user);
    
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const populateComments = searchParams.get('populate') === 'comments';

    console.log('Feed API query params:', { 
      limit, page, skip, populateComments,
      rawPopulate: searchParams.get('populate')
    });

    // If user is not authenticated, return empty array (client will use generated posts)
    if (!isAuthenticated) {
      return NextResponse.json({
        posts: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        },
        isAuthenticated: false
      }, { status: 200 });
    }

    const userId = session.user.id;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

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

    // Find users that the current user follows
    const following = await Follow.find({ follower: dbUser._id }).select('following');
    const followingIds = following.map(follow => follow.following);
    
    // Include the user's own posts in the feed
    followingIds.push(dbUser._id);

    // Get all posts, but prioritize posts from followed users
    const posts = await Post.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username image imageKey _id email')
      .populate({
        path: 'comments.user',
        select: 'name username image imageKey _id email' // Include email for debugging
      });

    console.log(`Retrieved ${posts.length} posts for feed, processing...`);

    // Process posts to ensure valid data structure
    const validPosts = posts.map(post => {
      try {
        if (!post.user || typeof post.user !== 'object') {
          console.warn(`Post ${post._id} has invalid user reference, skipping`);
          return null;
        }
        
        // Create a clean post object
        const processedPost = post.toObject ? post.toObject() : JSON.parse(JSON.stringify(post));
        
        // Process comments to ensure they have proper user data
        if (processedPost.comments && Array.isArray(processedPost.comments)) {
          processedPost.comments = processedPost.comments
            .filter((comment: any) => {
              // Skip comments with missing user data
              if (!comment || !comment.user) {
                console.warn(`Comment in post ${post._id} has missing user, filtering out`);
                return false;
              }
              return true;
            })
            .map((comment: any) => {
              // Ensure each comment has proper structure
              let processedComment = { ...comment };
              
              // Make sure comment has both text and content fields
              if (!processedComment.content && processedComment.text) {
                processedComment.content = processedComment.text;
              } else if (!processedComment.text && processedComment.content) {
                processedComment.text = processedComment.content;
              }
              
              return processedComment;
            });
        }
        
        return processedPost;
      } catch (err) {
        console.error(`Error processing post ${post._id}:`, err);
        return null;
      }
    }).filter(Boolean); // Remove any null posts

    // Count only valid posts (those with valid users)
    const validPostsCount = await Post.countDocuments({
      user: { $exists: true, $ne: null }
    });

    console.log(`Returning ${validPosts.length} valid posts for feed`);

    return NextResponse.json({
      posts: validPosts,
      pagination: {
        total: validPostsCount,
        page,
        limit,
        pages: Math.ceil(validPostsCount / limit)
      },
      isAuthenticated: true
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching feed posts:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch feed posts' },
      { status: 500 }
    );
  }
} 