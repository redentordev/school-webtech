/**
 * Utilities for handling image URLs, especially for user avatars
 */

/**
 * Generate direct S3 URL for an image key
 * @param imageKey S3 object key
 * @returns Direct URL to the image in S3
 */
export function getDirectS3Url(imageKey: string): string {
  if (!imageKey) return '';
  
  const region = 'us-east-1';
  const bucket = 'picwall-webtech';
  const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

/**
 * Gets the best available avatar URL for a user
 * @param user User object with possible imageKey and image properties
 * @returns The most appropriate avatar URL, prioritizing imageKey over image
 */
export function getUserAvatarUrl(user: { imageKey?: string; image?: string }): string {
  if (!user) return '';
  
  if (user.imageKey) {
    return getDirectS3Url(user.imageKey);
  }
  
  return user.image || '';
} 