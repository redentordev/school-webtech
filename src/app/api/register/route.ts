import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { email, password, name, username } = await req.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      username,
    });

    // Remove password from response
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      profilePicture: user.profilePicture,
    };

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 