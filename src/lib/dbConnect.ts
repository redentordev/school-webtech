import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// Define the type for our cached mongoose connection
interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global variable with proper type
// @ts-ignore
let cached: Cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  // @ts-ignore
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Add TLS options to match the MongoDB client configuration
      // This helps resolve SSL/TLS handshake issues in production
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: process.env.NODE_ENV === 'production',
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(() => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect; 