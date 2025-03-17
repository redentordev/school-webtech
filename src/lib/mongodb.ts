import { MongoClient, MongoClientOptions } from "mongodb";
import { logError, ErrorSeverity, ErrorSource } from './error-utils';

if (!process.env.MONGODB_URI) {
  const error = {
    message: 'Invalid/Missing environment variable: "MONGODB_URI"',
    source: ErrorSource.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    code: 'DB_MISSING_URI',
    timestamp: new Date().toISOString()
  };
  logError(error);
  throw new Error(error.message);
}

const uri = process.env.MONGODB_URI;
// Configure options based on environment
const options: MongoClientOptions = {
  // Force TLS version for MongoDB Atlas connections
  // This helps resolve SSL/TLS handshake issues
  tlsAllowInvalidCertificates: process.env.NODE_ENV === 'production',
};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    
    // Add error handling for the connection
    globalWithMongo._mongoClientPromise = client.connect()
      .then(client => {
        logError({
          message: 'MongoDB connected successfully (development)',
          source: ErrorSource.DATABASE,
          severity: ErrorSeverity.INFO,
          timestamp: new Date().toISOString()
        });
        return client;
      })
      .catch(error => {
        logError({
          message: 'Failed to connect to MongoDB (development)',
          source: ErrorSource.DATABASE,
          severity: ErrorSeverity.CRITICAL,
          code: 'DB_CONNECTION_FAILED',
          details: {
            errorMessage: error.message,
            errorName: error.name,
          },
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  
  // Add error handling for the connection
  clientPromise = client.connect()
    .then(client => {
      logError({
        message: 'MongoDB connected successfully (production)',
        source: ErrorSource.DATABASE,
        severity: ErrorSeverity.INFO,
        timestamp: new Date().toISOString()
      });
      return client;
    })
    .catch(error => {
      logError({
        message: 'Failed to connect to MongoDB (production)',
        source: ErrorSource.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        code: 'DB_CONNECTION_FAILED',
        details: {
          errorMessage: error.message,
          errorName: error.name,
        },
        timestamp: new Date().toISOString()
      });
      throw error;
    });
}

// Add unhandled rejection listener for MongoDB-related promises
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error && reason.message.includes('mongo')) {
      logError({
        message: 'Unhandled MongoDB Promise rejection',
        source: ErrorSource.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        code: 'DB_UNHANDLED_REJECTION',
        details: {
          reason: reason.message,
          stack: reason.stack
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 