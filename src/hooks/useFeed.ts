import useSWR, { SWRConfiguration } from 'swr';
import { useState, useEffect } from 'react';

// Type for real posts from the database
export type RealPost = {
  _id: string;
  user: {
    _id: string;
    name: string;
    username?: string;
    image?: string;
  };
  caption?: string;
  imageUrl: string;
  imageKey: string;
  likes: string[];
  comments: any[];
  createdAt: string;
  updatedAt: string;
  isFollowed?: boolean;
};

// Type for API response
export type FeedResponse = {
  posts: RealPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  isAuthenticated: boolean;
};

// SWR fetcher function
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }
  return res.json();
};

export function useFeed(isAuthenticated: boolean, options?: SWRConfiguration) {
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<RealPost[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Use SWR for fetching real posts
  const { data, error, isLoading, mutate } = useSWR<FeedResponse>(
    isAuthenticated ? `/api/feed?page=${page}&limit=5` : null,
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
      if (page === 1) {
        setAllPosts(data.posts);
      } else {
        setAllPosts(prev => [...prev, ...data.posts]);
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