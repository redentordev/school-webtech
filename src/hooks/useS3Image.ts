import useSWR, { KeyedMutator } from 'swr';

/**
 * Custom hook to fetch a presigned URL for an S3 image using SWR
 * @param imageKey The S3 key of the image
 * @returns An object containing the presigned URL, loading/error states, and a mutate function
 */
export function useS3Image(imageKey: string | undefined) {
  // Skip fetching if no imageKey is provided
  const { data, error, isLoading, mutate } = useSWR(
    imageKey ? `/api/images/${encodeURIComponent(imageKey)}` : null,
    async (url: string) => {
      console.log(`Fetching image URL from: ${url} (using SWR)`);
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`API response error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch image URL: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.url) {
        console.error('API returned empty URL for key:', imageKey);
        throw new Error('API returned empty URL');
      }
      
      console.log(`Received image URL for key ${imageKey} (first 50 chars): ${data.url.substring(0, 50)}...`);
      return data.url;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 3600000, // 1 hour in milliseconds
    }
  );

  return { 
    url: data || null, 
    isLoading, 
    error: error?.message || null,
    mutate
  };
} 