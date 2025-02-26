import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// Get current user profile
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

    const userId = session.user.id;
    const userEmail = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    await dbConnect();

    // Use a more robust user lookup strategy
    // First try to find the user by email (more reliable)
    let user = null;
    
    if (userEmail) {
      user = await User.findOne({ email: userEmail }).select('-password -__v');
      
      if (user && user._id.toString() !== userId) {
        console.log(`Profile: Found user with email ${userEmail} but different ID. DB ID: ${user._id}, Session ID: ${userId}`);
      }
    }
    
    // If no user found by email, try to find by ID
    if (!user) {
      user = await User.findById(userId).select('-password -__v');
    }

    if (!user) {
      console.error('User not found by either email or ID:', { userId, userEmail });
      
      // Try one more fallback - look for any user with this ID
      const anyUser = await User.findOne().select('-password -__v');
      if (anyUser) {
        console.log('Found at least one user in the database - the specific user is missing');
      } else {
        console.log('No users found in the database at all - potential database connection issue');
      }
      
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: Request) {
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
    const userEmail = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    const { name, username, bio } = await request.json();
    
    await dbConnect();

    // Find the user using the same robust strategy
    let user = null;
    
    if (userEmail) {
      user = await User.findOne({ email: userEmail });
      
      if (user && user._id.toString() !== userId) {
        console.log(`PUT Profile: Found user with email ${userEmail} but different ID. DB ID: ${user._id}, Session ID: ${userId}`);
      }
    }
    
    if (!user) {
      user = await User.findById(userId);
    }
    
    if (!user) {
      console.error('PUT: User not found by either email or ID:', { userId, userEmail });
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: user._id } 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    // Update the user profile
    if (name) user.name = name;
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    
    await user.save();
    
    // Return user without sensitive fields
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.__v;

    return NextResponse.json(
      { message: 'Profile updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 