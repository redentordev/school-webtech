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
import { logError, ErrorSeverity, ErrorSource, handleAuthError, handleMongoDBError } from "@/lib/error-utils";

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
          // Ensure username is always set
          username: profile.login || `github_${profile.id}`,
        };
      },
      allowDangerousEmailAccountLinking: true,
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
          // Ensure username is always set
          username: profile.email?.split('@')[0] || `google_${profile.sub}`,
        };
      },
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logError({
            message: "Missing email or password",
            source: ErrorSource.AUTH,
            severity: ErrorSeverity.WARNING,
            code: "AUTH_MISSING_CREDENTIALS",
            timestamp: new Date().toISOString(),
          });
          throw new Error("Invalid credentials");
        }

        try {
          await dbConnect();
        } catch (error: any) {
          const appError = handleMongoDBError(error, "authorize.dbConnect");
          logError(appError);
          throw new Error("Database connection failed");
        }

        try {
          const user = await User.findOne({ email: credentials.email });

          if (!user || !user?.password) {
            logError({
              message: "User not found or missing password",
              source: ErrorSource.AUTH,
              severity: ErrorSeverity.WARNING,
              code: "AUTH_USER_NOT_FOUND",
              details: { email: credentials.email },
              timestamp: new Date().toISOString(),
            });
            throw new Error("Invalid credentials");
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            logError({
              message: "Incorrect password",
              source: ErrorSource.AUTH,
              severity: ErrorSeverity.WARNING,
              code: "AUTH_INVALID_PASSWORD",
              details: { email: credentials.email },
              timestamp: new Date().toISOString(),
            });
            throw new Error("Invalid credentials");
          }

          logError({
            message: "User authenticated successfully",
            source: ErrorSource.AUTH,
            severity: ErrorSeverity.INFO,
            details: { 
              userId: user._id.toString(),
              email: user.email
            },
            timestamp: new Date().toISOString(),
          });

          return user;
        } catch (error: any) {
          if (error.message === "Invalid credentials") {
            throw error; // Re-throw auth errors
          }
          const appError = handleMongoDBError(error, "authorize.findUser");
          logError(appError);
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Log detailed information for debugging
        logError({
          message: "Sign-in attempt",
          source: ErrorSource.AUTH,
          severity: ErrorSeverity.INFO,
          details: { 
            user: user?.email || user?.name,
            provider: account?.provider,
            accountId: account?.providerAccountId,
            hasProfile: !!profile
          },
          timestamp: new Date().toISOString(),
        });
        
        // OAuth providers handling
        if (account && account.provider !== "credentials" && profile && user) {
          // We can still sync the profile in the background
          // but we won't pass it directly to avoid type issues
          logError({
            message: "Syncing OAuth profile for user",
            source: ErrorSource.AUTH,
            severity: ErrorSeverity.INFO,
            details: { 
              email: user.email, 
              provider: account.provider 
            },
            timestamp: new Date().toISOString(),
          });
          
          // Make sure to actually call syncUserProfile
          try {
            await syncUserProfile(user as any, account, profile);
          } catch (error: any) {
            const appError = handleAuthError(error, "syncUserProfile");
            logError(appError);
          }
        }
        
        return true;
      } catch (error: any) {
        const appError = handleAuthError(error, "signIn callback");
        logError(appError);
        return true; // Still allow sign in even if custom logic fails
      }
    },
    async session({ session, token, user }) {
      try {
        if (session.user) {
          // Add the user ID to the session
          session.user.id = token.sub || user?.id;
          
          // If we have access to the database user (through adapter session)
          if (user) {
            // Add custom user fields to session
            // Using type assertion to bypass TypeScript error
            const extendedSession = session as any;
            extendedSession.user.username = (user as any).username || null;
          }
        }
        return session;
      } catch (error: any) {
        const appError = handleAuthError(error, "session callback");
        logError(appError);
        return session; // Return session even if there's an error
      }
    },
    async jwt({ token, user, account }) {
      try {
        // Initial sign in
        if (user) {
          token.id = user.id;
          token.provider = account?.provider;
          // Also store username in the token if available
          // Using type assertion to bypass TypeScript error
          (token as any).username = (user as any).username || null;
        }
        return token;
      } catch (error: any) {
        const appError = handleAuthError(error, "jwt callback");
        logError(appError);
        return token; // Return token even if there's an error
      }
    }
  },
  pages: {
    signIn: "/login",
    error: "/error", // Point to our custom error page
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser(message) {
      // Log when a user is created
      logError({
        message: "User created via OAuth",
        source: ErrorSource.AUTH,
        severity: ErrorSeverity.INFO,
        details: { 
          userId: message.user.id,
          email: message.user.email
        },
        timestamp: new Date().toISOString(),
      });
    },
    async linkAccount(message) {
      // Log when an account is linked
      logError({
        message: "Account linked",
        source: ErrorSource.AUTH,
        severity: ErrorSeverity.INFO,
        details: { 
          userId: message.user.id,
          provider: message.account.provider
        },
        timestamp: new Date().toISOString(),
      });
    },
    async signIn(message) {
      // Log successful sign-ins
      logError({
        message: "User signed in",
        source: ErrorSource.AUTH,
        severity: ErrorSeverity.INFO,
        details: { 
          userId: message.user.id,
          email: message.user.email,
          provider: message.account?.provider || "credentials"
        },
        timestamp: new Date().toISOString(),
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 