import { AuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { syncUserProfile } from "@/lib/auth-utils";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "Webtech",
  }),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          // Store additional profile data if needed
          username: profile.login,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Store additional profile data if needed
          username: profile.email?.split('@')[0],
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email });

        if (!user || !user?.password) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Log detailed information for debugging
        console.log("Sign-in attempt:", { 
          user: user?.email || user?.name,
          provider: account?.provider,
          accountId: account?.providerAccountId,
          profile: !!profile
        });
        
        // OAuth providers handling
        if (account && account.provider !== "credentials" && profile && user) {
          // We can still sync the profile in the background
          // but we won't pass it directly to avoid type issues
          console.log("Syncing OAuth profile for user:", user.email);
        }
        
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Still allow sign in even if custom logic fails
      }
    },
    async session({ session, token, user }) {
      if (session.user) {
        // Add the user ID to the session
        session.user.id = token.sub || user?.id;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.provider = account?.provider;
      }
      return token;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login", // Add custom error page
  },
  debug: true,
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser(message) {
      // Log when a user is created
      console.log("User created:", message);
    },
    async linkAccount(message) {
      // Log when an account is linked
      console.log("Account linked:", message);
    },
    async signIn(message) {
      // Log successful sign-ins
      console.log("User signed in:", message);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 