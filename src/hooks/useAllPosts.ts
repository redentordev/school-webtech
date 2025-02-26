import useSWR, { SWRConfiguration } from 'swr';
import { useState, useEffect } from 'react';
import { Comment, RealPost } from './useFeed';

// Type for API response
export type AllPostsResponse = {
  posts: RealPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// SWR fetcher function
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }
  return res.json();
};

export function useAllPosts(isAuthenticated: boolean, options?: SWRConfiguration) {
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<RealPost[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Use SWR for fetching all posts
  const { data, error, isLoading, mutate } = useSWR<AllPostsResponse>(
    isAuthenticated ? `/api/posts?page=${page}&limit=5` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
      ...options
    }
  );

  // Update allPosts when data changes
  useEffect(() => {
    if (data && data.posts) {
      // Filter out posts with invalid user data
      const validPosts = data.posts.filter(post => 
        post.user && typeof post.user === 'object' && post.user._id
      );
      
      if (page === 1) {
        // Replace all posts when on first page
        setAllPosts(validPosts);
      } else {
        // For subsequent pages, append only new posts that aren't already in the list
        setAllPosts(prev => {
          // Create a Set of existing post IDs for quick lookup
          const existingPostIds = new Set(prev.map(post => post._id));
          
          // Only add posts that don't already exist in the list
          const newPosts = validPosts.filter(post => !existingPostIds.has(post._id));
          
          return [...prev, ...newPosts];
        });
      }
      
      // Check if there are more posts to load
      setHasMore(data.pagination.page < data.pagination.pages);
    }
  }, [data, page]);

  // Function to load more posts
  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Function to refresh the feed
  const refresh = () => {
    setPage(1);
    setAllPosts([]);
    mutate();
  };

  return {
    posts: allPosts,
    error,
    isLoading,
    loadMore,
    hasMore,
    refresh,
    mutate,
    page
  };
} 