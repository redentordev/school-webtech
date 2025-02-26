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
    const userEmail = session.user.email;
    
    // First check if a user with this email already exists
    // This handles the case where a user might exist but with a different ID
    let user = null;
    
    if (userEmail) {
      user = await User.findOne({ email: userEmail }).exec();
      
      if (user && user._id.toString() !== userId) {
        console.log(`Found user with email ${userEmail} but different ID. Original: ${user._id}, Session: ${userId}`);
        // We don't need to create a new user, just update the existing one
        // This prevents duplicate key errors
      }
    }
    
    // If no user found by email, try to find by ID
    if (!user) {
      user = await User.findById(userId).exec();
    }
    
    // If still no user, create a new one
    if (!user) {
      // Before creating, double check there's no conflict
      if (userEmail) {
        const duplicateCheck = await User.findOne({ email: userEmail }).exec();
        if (duplicateCheck) {
          console.error(`Duplicate user detected. Email: ${userEmail}, DB ID: ${duplicateCheck._id}, Session ID: ${userId}`);
          return NextResponse.json({
            success: false, 
            message: "User already exists with this email",
            emailConflict: true
          }, { status: 409 });
        }
      }
      
      console.log("User not found in database. Creating user from OAuth data:", userId);
      
      // Create a new user record using session data
      user = new User({
        _id: userId, // Use the same ID as in the session
        name: session.user.name,
        email: userEmail,
        image: session.user.image,
        emailVerified: new Date(), // Mark as verified since it came from OAuth
        // Generate username from email or name
        username: userEmail 
          ? userEmail.split('@')[0] 
          : session.user.name?.replace(/\s+/g, '').toLowerCase() || `user_${userId.substring(0, 6)}`,
      });
      
      // Save the new user
      await user.save();
      console.log("Created new user from OAuth data:", userId);
    } else {
      console.log("Found existing user:", userId);
    }

    // Flag to track if we need to save changes
    let needsUpdate = false;

    // Generate username if missing
    if (!user.username) {
      needsUpdate = true;
      // Try different sources for username
      let baseUsername = '';
      
      if (userEmail) {
        baseUsername = userEmail.split('@')[0];
      } else if (session.user.name) {
        baseUsername = session.user.name.replace(/\s+/g, '').toLowerCase();
      } else {
        // Fallback to a generic username with user ID
        baseUsername = `user_${userId.substring(0, 6)}`;
      }
      
      // Check if username exists
      const existingWithUsername = await User.findOne({ 
        username: baseUsername, 
        _id: { $ne: user._id } 
      }).exec();
      
      if (!existingWithUsername) {
        user.username = baseUsername;
      } else {
        // Add random number to make unique
        user.username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    // Make sure email is verified if using OAuth
    if (!user.emailVerified) {
      user.emailVerified = new Date();
      needsUpdate = true;
    }

    // If image is missing but available in the session, add it
    if (!user.image && session.user.image) {
      user.image = session.user.image;
      needsUpdate = true;
    }

    // Save changes if needed
    if (needsUpdate) {
      await user.save();
      console.log("Updated user profile:", userId, "username:", user.username);
    }

    // Return safe user data and sync status
    return NextResponse.json({
      success: true,
      syncComplete: true, // Add this flag to indicate no further sync needed
      user: {
        id: user._id.toString(),
        name: user.name || null,
        email: user.email || null,
        image: user.image || null,
        username: user.username || null,
        bio: user.bio || null
      }
    });
    
  } catch (error) {
    // Handle duplicate key error specifically
    if (error && 
        typeof error === 'object' && 
        'name' in error && 
        error.name === 'MongoServerError' && 
        'code' in error && 
        error.code === 11000) {
      
      // Safe way to access error message
      const errorMessage = 'message' in error ? String(error.message) : 'Duplicate key error';
      console.error("Duplicate key error:", errorMessage);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "User with this email already exists", 
          error: errorMessage,
          emailConflict: true
        },
        { status: 409 }
      );
    }
    
    console.error("Error syncing profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
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
        name: userData.name || null,
        email: userData.email || null,
        image: userData.image || null,
        username: userData.username || null,
        bio: userData.bio || null
      }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    );
  }
} 