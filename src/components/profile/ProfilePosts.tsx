'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Post } from '@/types/post';
import { PostModal } from './PostModal';
import { S3Image } from '@/components/S3Image';
import useSWR, { KeyedMutator } from 'swr';
import { useS3ImageContext } from '@/contexts/S3ImageContext';

interface ProfilePostsProps {
  userId: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface S3ImageContextType {
  registerMutator: (key: string, mutate: KeyedMutator<any>) => void;
  unregisterMutator: (key: string) => void;
  invalidateImages: () => void;
}

export function ProfilePosts({ userId }: ProfilePostsProps) {
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrlCache, setImageUrlCache] = useState<Record<string, string>>({});
  
  // Try to use the S3ImageContext if available
  let s3ImageContext: S3ImageContextType | undefined;
  try {
    s3ImageContext = useS3ImageContext();
  } catch (error) {
    // Context not available, will handle gracefully
  }

  // Use SWR to fetch posts
  const { data, error, isLoading, mutate } = useSWR<PostsResponse>(
    `/api/user/posts?page=${page}&limit=12`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json();
    }
  );

  // Use SWR to fetch image URLs for the posts
  const fetchImageUrl = async (imageKey: string) => {
    // If we already have the URL cached, return it
    if (imageUrlCache[imageKey]) {
      return imageUrlCache[imageKey];
    }

    try {
      const response = await fetch(`/api/s3/url?key=${encodeURIComponent(imageKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch image URL');
      }
      const data = await response.json();
      
      // Cache the URL
      setImageUrlCache(prev => ({
        ...prev,
        [imageKey]: data.url
      }));
      
      return data.url;
    } catch (error) {
      console.error('Error fetching image URL:', error);
      // Use a direct URL as fallback
      const region = 'us-east-1';
      const bucket = 'picwall-webtech'; 
      const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
      const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
      
      // Cache the fallback URL
      setImageUrlCache(prev => ({
        ...prev,
        [imageKey]: publicUrl
      }));
      
      return publicUrl;
    }
  };

  // Update allPosts when data changes
  if (data && !isLoading) {
    if (page === 1 && allPosts.length === 0) {
      setAllPosts(data.posts);
      
      // Prefetch image URLs for these posts
      data.posts.forEach(post => {
        if (post.imageKey) {
          fetchImageUrl(post.imageKey);
        }
      });
    } else if (page > 1 && allPosts.length < page * 12) {
      // Only append new posts if they haven't been added yet
      setAllPosts(prev => [...prev, ...data.posts]);
      
      // Prefetch image URLs for the new posts
      data.posts.forEach(post => {
        if (post.imageKey) {
          fetchImageUrl(post.imageKey);
        }
      });
    }
  }

  const hasMore = data ? data.pagination.page < data.pagination.pages : false;

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const openPostModal = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closePostModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setAllPosts(posts => posts.map(p => p._id === updatedPost._id ? updatedPost : p));
    
    // Refresh the post data
    mutate();
    
    // Invalidate S3Image cache if needed
    if (s3ImageContext) {
      s3ImageContext.invalidateImages();
    }
    
    // Clear our local image URL cache
    setImageUrlCache({});
  };

  const handlePostDelete = (deletedPostId: string) => {
    setAllPosts(posts => posts.filter(p => p._id !== deletedPostId));
    closePostModal();
    
    // Refresh the post data
    mutate();
    
    // Invalidate S3Image cache if needed
    if (s3ImageContext) {
      s3ImageContext.invalidateImages();
    }
    
    // Clear our local image URL cache
    setImageUrlCache({});
  };

  // Skeleton loader for posts
  const PostSkeleton = () => (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div 
          key={`skeleton-${index}`} 
          className="aspect-square bg-zinc-800 animate-pulse rounded-sm border border-zinc-700"
        />
      ))}
    </>
  );

  if (isLoading && allPosts.length === 0) {
    return (
      <div className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (error && allPosts.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>{error.message || 'Failed to load posts'}</p>
        <Button 
          variant="outline" 
          className="mt-4 border-zinc-700 text-white hover:bg-zinc-800"
          onClick={() => {
            setPage(1);
            setAllPosts([]);
            mutate();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>No posts yet</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Post Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
        {allPosts.map((post) => (
          <div 
            key={post._id} 
            className="aspect-square relative cursor-pointer rounded-sm overflow-hidden border border-zinc-800"
            onClick={() => openPostModal(post)}
          >
            {/* Use standard img tag instead of S3Image component for better handling of large images */}
            {imageUrlCache[post.imageKey] ? (
              <img
                src={imageUrlCache[post.imageKey]}
                alt={post.caption || 'Post'}
                className="object-cover w-full h-full hover:opacity-90 transition-opacity"
                onError={() => {
                  // If image fails to load, try to refetch the URL
                  fetchImageUrl(post.imageKey);
                }}
              />
            ) : (
              <div className="flex items-center justify-center bg-zinc-800 w-full h-full">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                {/* Attempt to fetch the image URL if not already in progress */}
                {post.imageKey && !imageUrlCache[post.imageKey] && fetchImageUrl(post.imageKey)}
              </div>
            )}
          </div>
        ))}
        
        {/* Show skeletons when loading more posts */}
        {isLoading && hasMore && (
          <PostSkeleton />
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          isOpen={isModalOpen}
          onClose={closePostModal}
          post={selectedPost}
          onPostUpdate={handlePostUpdate}
          onPostDelete={handlePostDelete}
        />
      )}
    </div>
  );
} 