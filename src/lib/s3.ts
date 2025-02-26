import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

// Validate environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
  console.error('Missing required AWS environment variables:', {
    region: !!process.env.AWS_REGION,
    accessKey: !!process.env.AWS_ACCESS_KEY_ID,
    secretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: !!bucketName
  });
}

/**
 * Generate a presigned URL for uploading a file to S3
 * @param fileType MIME type of the file
 * @param folder Optional folder path to store the file in (default: 'uploads')
 * @returns Object containing the upload URL and the key (filename) in S3
 */
export async function generateUploadURL(fileType: string, folder: string = 'uploads') {
  // Validate file type
  if (!fileType.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Get file extension from MIME type
  const fileExtension = fileType.split('/')[1];
  const key = `${folder}/${uuidv4()}.${fileExtension}`;
  
  const putObjectParams = {
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(putObjectParams);
  const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 60 * 15 }); // URL expires in 15 minutes (increased from 5)

  return {
    uploadURL,
    key,
  };
}

/**
 * Generate a presigned URL for viewing an object in S3
 * @param key The key (filename) of the object in S3
 * @param expiresIn Time in seconds until the URL expires (default: 1 hour)
 * @returns The presigned URL for viewing the object
 */
export async function generateViewURL(key: string, expiresIn: number = 7200) { // Increased to 2 hours
  console.log(`Generating view URL for key: ${key}`);
  console.log(`Using bucket: ${bucketName}`);
  console.log(`AWS Region: ${process.env.AWS_REGION}`);
  console.log(`Access Key ID (first 4 chars): ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 4)}***`);
  
  if (!key) {
    throw new Error('Key is required to generate view URL');
  }
  
  if (!bucketName) {
    throw new Error('S3 bucket name is not configured');
  }
  
  try {
    // Normalize the key to handle URL encoding issues
    const normalizedKey = key.startsWith('/') ? key.substring(1) : key;
    console.log(`Normalized key: ${normalizedKey}`);
    
    const params = {
      Bucket: bucketName,
      Key: normalizedKey,
    };

    // First check if the object exists
    try {
      const command = new GetObjectCommand(params);
      console.log('GetObjectCommand created, generating signed URL...');
      const url = await getSignedUrl(s3Client, command, { 
        expiresIn,
      });
      
      console.log(`Generated presigned URL (first 50 chars): ${url.substring(0, 50)}...`);
      console.log(`URL expires in: ${expiresIn} seconds`);
      
      // Add cache control parameters to the URL
      const urlWithCacheControl = new URL(url);
      urlWithCacheControl.searchParams.append('response-cache-control', 'no-cache, no-store, must-revalidate');
      urlWithCacheControl.searchParams.append('response-content-disposition', 'inline');
      
      return urlWithCacheControl.toString();
    } catch (error: any) {
      console.error(`Error generating presigned URL for ${normalizedKey}:`, error);
      console.error(`Error name: ${error.name}, code: ${error.code}, message: ${error.message}`);
      if (error.$metadata) {
        console.error(`Error metadata: ${JSON.stringify(error.$metadata)}`);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    console.error(`Error details: ${JSON.stringify(error)}`);
    
    // Try to use a public URL as fallback
    try {
      const publicUrl = getPublicURL(key);
      console.log(`Falling back to public URL: ${publicUrl}`);
      return publicUrl;
    } catch (fallbackError: any) {
      console.error('Error generating fallback public URL:', fallbackError);
      console.error(`Fallback error details: ${JSON.stringify(fallbackError)}`);
      throw error; // Throw the original error
    }
  }
}

/**
 * Get a public URL for an object in S3
 * @param key The key (filename) of the object in S3
 * @returns The public URL of the object
 */
export function getPublicURL(key: string) {
  if (!bucketName || !process.env.AWS_REGION) {
    throw new Error('S3 bucket name or region is not configured');
  }
  
  // Normalize the key
  const normalizedKey = key.startsWith('/') ? key.substring(1) : key;
  const encodedKey = encodeURIComponent(normalizedKey).replace(/%2F/g, '/');
  
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodedKey}`;
}

/**
 * Delete an object from S3
 * @param key The key (filename) of the object to delete
 */
export async function deleteObject(key: string) {
  if (!key) {
    throw new Error('Key is required to delete object');
  }
  
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`Successfully deleted object with key: ${key}`);
  } catch (error) {
    console.error(`Error deleting object with key ${key}:`, error);
    throw error;
  }
} 