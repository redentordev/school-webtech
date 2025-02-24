declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
  }
} 