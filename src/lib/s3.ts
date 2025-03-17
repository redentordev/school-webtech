import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { handleS3Error, logError, ErrorSeverity, ErrorSource } from './error-utils';

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
  const missingVars = {
    region: !!process.env.AWS_REGION,
    accessKey: !!process.env.AWS_ACCESS_KEY_ID,
    secretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: !!bucketName
  };
  
  logError({
    message: 'Missing required AWS environment variables',
    source: ErrorSource.S3_STORAGE,
    severity: ErrorSeverity.CRITICAL,
    code: 'S3_ENV_MISSING',
    details: missingVars,
    timestamp: new Date().toISOString()
  });
}

/**
 * Generate a presigned URL for uploading a file to S3
 * @param fileType MIME type of the file
 * @param folder Optional folder path to store the file in (default: 'uploads')
 * @returns Object containing the upload URL and the key (filename) in S3
 */
export async function generateUploadURL(fileType: string, folder: string = 'uploads') {
  try {
    // Validate file type
    if (!fileType.startsWith('image/')) {
      const error = {
        message: 'Only image files are allowed',
        source: ErrorSource.S3_STORAGE,
        severity: ErrorSeverity.WARNING,
        code: 'S3_INVALID_FILE_TYPE',
        details: { fileType },
        timestamp: new Date().toISOString()
      };
      logError(error);
      throw new Error(error.message);
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
    const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 60 * 15 }); // URL expires in 15 minutes

    logError({
      message: 'Upload URL generated successfully',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO,
      details: { key, fileType, folder },
      timestamp: new Date().toISOString()
    });

    return {
      uploadURL,
      key,
    };
  } catch (error: any) {
    const appError = handleS3Error(error, 'generateUploadURL');
    logError(appError);
    throw new Error(appError.message);
  }
}

/**
 * Generate a presigned URL for viewing an object in S3
 * @param key The key (filename) of the object in S3
 * @param expiresIn Time in seconds until the URL expires (default: 1 hour)
 * @returns The presigned URL for viewing the object
 */
export async function generateViewURL(key: string, expiresIn: number = 7200) { // Increased to 2 hours
  if (!key) {
    const error = {
      message: 'Key is required to generate view URL',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.WARNING,
      code: 'S3_MISSING_KEY',
      timestamp: new Date().toISOString()
    };
    logError(error);
    throw new Error(error.message);
  }
  
  if (!bucketName) {
    const error = {
      message: 'S3 bucket name is not configured',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.CRITICAL,
      code: 'S3_MISSING_BUCKET',
      timestamp: new Date().toISOString()
    };
    logError(error);
    throw new Error(error.message);
  }
  
  try {
    // Normalize the key to handle URL encoding issues
    const normalizedKey = key.startsWith('/') ? key.substring(1) : key;
    logError({
      message: 'Generating view URL',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO,
      details: { 
        key: normalizedKey, 
        bucket: bucketName,
        region: process.env.AWS_REGION,
        expiresIn
      },
      timestamp: new Date().toISOString()
    });
    
    const params = {
      Bucket: bucketName,
      Key: normalizedKey,
    };

    // First check if the object exists
    try {
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(s3Client, command, { 
        expiresIn,
      });
      
      // Add cache control parameters to the URL
      const urlWithCacheControl = new URL(url);
      urlWithCacheControl.searchParams.append('response-cache-control', 'no-cache, no-store, must-revalidate');
      urlWithCacheControl.searchParams.append('response-content-disposition', 'inline');
      
      logError({
        message: 'Generated presigned URL successfully',
        source: ErrorSource.S3_STORAGE,
        severity: ErrorSeverity.INFO,
        details: { 
          key: normalizedKey,
          urlLength: url.length,
          expiresIn
        },
        timestamp: new Date().toISOString()
      });
      
      return urlWithCacheControl.toString();
    } catch (error: any) {
      const appError = handleS3Error(error, `generateViewURL for ${normalizedKey}`);
      logError(appError);
      throw error;
    }
  } catch (error: any) {
    const appError = handleS3Error(error, 'generateViewURL');
    logError(appError);
    
    // Try to use a public URL as fallback
    try {
      const publicUrl = getPublicURL(key);
      logError({
        message: 'Falling back to public URL',
        source: ErrorSource.S3_STORAGE,
        severity: ErrorSeverity.WARNING,
        details: { key, publicUrl },
        timestamp: new Date().toISOString()
      });
      return publicUrl;
    } catch (fallbackError: any) {
      const fallbackAppError = handleS3Error(fallbackError, 'getPublicURL fallback');
      logError(fallbackAppError);
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
    const error = {
      message: 'S3 bucket name or region is not configured',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.CRITICAL,
      code: 'S3_MISSING_CONFIG',
      details: { 
        hasBucketName: !!bucketName, 
        hasRegion: !!process.env.AWS_REGION 
      },
      timestamp: new Date().toISOString()
    };
    logError(error);
    throw new Error(error.message);
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
    const error = {
      message: 'Key is required to delete object',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.WARNING,
      code: 'S3_MISSING_KEY',
      timestamp: new Date().toISOString()
    };
    logError(error);
    throw new Error(error.message);
  }
  
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    logError({
      message: 'Successfully deleted object',
      source: ErrorSource.S3_STORAGE,
      severity: ErrorSeverity.INFO,
      details: { key },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const appError = handleS3Error(error, `deleteObject for ${key}`);
    logError(appError);
    throw new Error(appError.message);
  }
} 