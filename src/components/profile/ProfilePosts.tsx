'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { KeyedMutator } from 'swr';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Post } from '@/types/post';
import { PostModal } from './PostModal';
import Image from 'next/image';
import { getDirectS3Url, getUserAvatarUrl } from '@/lib/image-utils';

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

export function ProfilePosts({ userId }: ProfilePostsProps) {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrlCache, setImageUrlCache] = useState<Record<string, string>>({});
  
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

  // Cache image URLs for better performance
  const getImageUrl = (imageKey: string) => {
    if (!imageKey) return '';
    
    if (imageUrlCache[imageKey]) {
      return imageUrlCache[imageKey];
    }
    
    const directUrl = getDirectS3Url(imageKey);
    
    // Cache the URL
    setImageUrlCache(prev => ({
      ...prev,
      [imageKey]: directUrl
    }));
    
    return directUrl;
  };

  // Update allPosts when data changes
  useEffect(() => {
    if (data && !isLoading) {
      if (page === 1 && allPosts.length === 0) {
        setAllPosts(data.posts);
        
        // Prefetch image URLs for these posts
        data.posts.forEach(post => {
          if (post.imageKey) {
            getImageUrl(post.imageKey);
          }
        });
      } else if (page > 1 && allPosts.length < page * 12) {
        // Only append new posts if they haven't been added yet
        setAllPosts(prev => [...prev, ...data.posts]);
        
        // Prefetch image URLs for the new posts
        data.posts.forEach(post => {
          if (post.imageKey) {
            getImageUrl(post.imageKey);
          }
        });
      }
    }
  }, [data, isLoading, page, allPosts.length]);

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
    
    // Clear our local image URL cache
    setImageUrlCache({});
  };

  const handlePostDelete = (deletedPostId: string) => {
    setAllPosts(posts => posts.filter(p => p._id !== deletedPostId));
    closePostModal();
    
    // Refresh the post data
    mutate();
    
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
            {/* Use Next/Image with direct S3 URL */}
            <Image
              src={getImageUrl(post.imageKey)}
              alt={post.caption || 'Post'}
              fill
              className="object-cover hover:opacity-90 transition-opacity"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => {
                console.error(`Failed to load image with key: ${post.imageKey}`);
              }}
            />
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