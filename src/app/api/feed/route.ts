import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import Follow from '@/models/Follow';

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

    // Find users that the current user follows
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(follow => follow.following);

    // Get all posts, but prioritize posts from followed users
    // We'll use aggregation to add a field that indicates if the post is from a followed user
    const posts = await Post.aggregate([
      {
        $addFields: {
          isFollowed: {
            $cond: {
              if: { $in: ["$user", followingIds] },
              then: true,
              else: false
            }
          }
        }
      },
      { $sort: { isFollowed: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Populate user information
    await Post.populate(posts, { path: 'user', select: 'name username image' });
    await Post.populate(posts, { path: 'comments.user', select: 'name username image' });

    const total = await Post.countDocuments();

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
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