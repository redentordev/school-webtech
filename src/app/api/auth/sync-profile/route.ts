import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

/**
 * API endpoint to sync user profile data after OAuth login
 * This is called client-side after successful OAuth login
 */
export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Make sure user is authenticated
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    const userId = session.user.id;
    
    // Get current user data
    const user = await User.findById(userId).exec();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Generate username if missing
    if (!user.username && session.user.email) {
      // Extract username from email
      const baseUsername = session.user.email.split('@')[0] || 
                          (session.user.name?.replace(/\s+/g, '').toLowerCase() || '');
      
      if (baseUsername) {
        // Check if username exists
        const existingWithUsername = await User.findOne({ 
          username: baseUsername, 
          _id: { $ne: userId } 
        }).exec();
        
        if (!existingWithUsername) {
          user.username = baseUsername;
        } else {
          // Add random number to make unique
          user.username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        }
        
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error("Error syncing profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get current user profile data
 */
export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Make sure user is authenticated
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const user = await User.findById(session.user.id)
      .select("_id name email image username bio")
      .lean();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Use type assertion to handle Mongoose document type
    const userData = user as any;

    return NextResponse.json({
      success: true,
      user: {
        id: userData._id.toString(),
        name: userData.name,
        email: userData.email,
        image: userData.image,
        username: userData.username,
        bio: userData.bio
      }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 