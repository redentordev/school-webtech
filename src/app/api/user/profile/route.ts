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
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    await dbConnect();

    // Find the user and exclude sensitive fields
    const user = await User.findById(userId).select('-password -__v');

    if (!user) {
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
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 500 }
      );
    }

    const { name, username, bio } = await request.json();
    
    await dbConnect();

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    // Update the user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...(name && { name }),
        ...(username && { username }),
        ...(bio !== undefined && { bio })
      },
      { new: true }
    ).select('-password -__v');

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

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