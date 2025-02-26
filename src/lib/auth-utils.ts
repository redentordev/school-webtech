import User from "@/models/User";
import dbConnect from "./dbConnect";
import { Account } from "next-auth";
import { AdapterUser } from "next-auth/adapters";

interface ExtendedUser extends AdapterUser {
  username?: string;
}

/**
 * Ensures that a user's profile is properly synchronized with your database
 * This is particularly useful for OAuth logins where you need to add custom fields
 * or ensure data consistency
 */
export async function syncUserProfile(
  user: ExtendedUser,
  account: Account | null,
  profile: any
) {
  // Only proceed if we have a valid user
  if (!user.id || !user.email) return user;

  try {
    await dbConnect();

    // Check if we need to generate a username
    let username = user.username;
    if (!username) {
      // Generate a username from email or name if not provided
      username = user.email.split('@')[0] || user.name?.replace(/\s+/g, '').toLowerCase() || `user_${Date.now()}`;
    }

    // Find the user in your database
    const existingUser = await User.findById(user.id).exec();

    if (existingUser) {
      // Update existing user with any new profile data
      const updates: Record<string, any> = {
        emailVerified: user.emailVerified || new Date(),
      };

      // Only update image if provided and different
      if (user.image && existingUser.image !== user.image) {
        updates.image = user.image;
      }

      // Only update username if it doesn't exist
      if (!existingUser.username && username) {
        // Check for username uniqueness
        const usernameExists = await User.findOne({ username }).exec();
        if (!usernameExists || usernameExists.id === user.id) {
          updates.username = username;
        }
      }

      // Apply updates if we have any
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user.id, updates, { new: true }).exec();
      }
    } else {
      // This shouldn't usually happen as the adapter should create the user
      // But we'll handle it just in case
      console.warn("User not found in database after OAuth login:", user.id);
    }

    return user;
  } catch (error) {
    console.error("Error syncing user profile:", error);
    return user; // Return the original user even if sync fails
  }
}

/**
 * Generate a unique username based on the email or name
 */
export async function generateUniqueUsername(baseUsername: string): Promise<string> {
  await dbConnect();
  
  // Check if the username is already taken
  const existingUser = await User.findOne({ username: baseUsername }).exec();
  
  if (!existingUser) {
    return baseUsername;
  }
  
  // If username exists, append a random number until we find a unique one
  let attemptCount = 0;
  let uniqueUsername = '';
  
  do {
    attemptCount++;
    uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ username: uniqueUsername }).exec();
    if (!exists) {
      return uniqueUsername;
    }
  } while (attemptCount < 5);
  
  // If we've tried 5 times and still no unique username, create a timestamp-based one
  return `${baseUsername}_${Date.now()}`;
} 