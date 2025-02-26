/**
 * Helper function to generate a direct S3 URL for an image
 * @param imageKey The S3 key of the image
 * @returns An object containing the direct S3 URL
 */
export function useS3Image(imageKey: string | undefined) {
  if (!imageKey) {
    return { 
      url: null, 
      isLoading: false, 
      error: null,
      mutate: () => Promise.resolve() 
    };
  }

  // Generate direct S3 bucket URL
  const region = 'us-east-1'; // S3 region
  const bucket = 'picwall-webtech'; // S3 bucket name
  const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
  const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;

  return { 
    url: directUrl, 
    isLoading: false, 
    error: null,
    mutate: () => Promise.resolve() 
  };
} 