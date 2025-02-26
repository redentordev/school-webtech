'use client';

import { useEffect, useState, useRef } from 'react';
import { faker } from '@faker-js/faker';
import { Post } from './Post';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useFeed, RealPost, Comment } from '@/hooks/useFeed';
import { useAllPosts } from '@/hooks/useAllPosts';
import { FeedProvider } from '@/contexts/FeedContext';

// Type for auto-generated posts
type GeneratedPost = {
  username: string;
  userAvatar: string;
  timeAgo: string;
  image: string;
  likes: number;
  caption: string;
};

// Generate a random username
const generateUsername = () => {
  const firstName = faker.person.firstName().toLowerCase();
  const lastName = faker.person.lastName().toLowerCase();
  return `${firstName}${lastName.charAt(0)}${Math.floor(Math.random() * 100)}`;
};

// Generate dummy posts for infinite scroll
const generatePosts = (page: number): GeneratedPost[] => {
  return Array.from({ length: 5 }, (_, i) => {
    const postId = page * 5 + i + 1;
    const username = generateUsername();
    
    // Generate a creative caption
    const topics = ['minimalism', 'photography', 'art', 'design', 'inspiration', 'mood'];
    const randomTopics = faker.helpers.shuffle(topics).slice(0, 2);
    const caption = `${faker.word.words({ count: { min: 5, max: 15 } })} ${randomTopics.map(topic => `#${topic}`).join(' ')} #picwall`;

    return {
      username,
      userAvatar: `https://picsum.photos/seed/avatar${postId}/150/150`,
      timeAgo: `${Math.floor(Math.random() * 24)}h`,
      image: `https://picsum.photos/seed/post${postId}/800/800`,
      likes: faker.number.int({ min: 50, max: 2000 }),
      caption,
    };
  });
};

// Format date to relative time
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  } else {
    return `${Math.floor(diffInSeconds / 604800)}w`;
  }
};

// Post type definition 
interface Post {
  _id: string;
  user: {
    _id: string;
    name: string;
    username?: string;
    image?: string;
    imageKey?: string;
  };
  imageUrl: string;
  caption: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export function Feed() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  // State for generated posts (non-authenticated users)
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [generatedPage, setGeneratedPage] = useState(0);
  
  // Use custom hook for all posts
  const { 
    posts: allPosts, 
    error: postsError, 
    isLoading: isPostsLoading, 
    loadMore: loadMorePosts,
    hasMore: hasMorePosts,
    refresh: refreshPosts,
    mutate: mutatePosts
  } = useAllPosts(isAuthenticated);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load initial posts for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      const initialPosts = generatePosts(0);
      setGeneratedPosts(initialPosts);
      setGeneratedPage(1);
    }
  }, [isAuthenticated]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const handleLoadMore = () => {
      if (loading) return;

      if (isAuthenticated) {
        if (hasMorePosts) {
          loadMorePosts();
        }
      } else {
        setLoading(true);
        const newPosts = generatePosts(generatedPage);
        setGeneratedPosts(prev => [...prev, ...newPosts]);
        setGeneratedPage(prev => prev + 1);
        setLoading(false);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading, isAuthenticated, generatedPage, hasMorePosts, loadMorePosts]);

  // Handle post update (likes, comments)
  const handlePostUpdate = (updatedPost: RealPost) => {
    // Update the post in the list
    const updatedPosts = allPosts.map(post => 
      post._id === updatedPost._id ? updatedPost : post
    );
    
    // Update the cache with the new data
    mutatePosts(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: updatedPosts
      };
    }, false); // Don't revalidate immediately
  };

  // Update posts when data changes
  useEffect(() => {
    if (isAuthenticated && allPosts.length === 0 && !isPostsLoading && !postsError) {
      // This is just to ensure we don't have an empty feed when we have posts
      // but they haven't been set in the component state yet
      if (mutatePosts) {
        mutatePosts();
      }
    }
  }, [isAuthenticated, allPosts.length, isPostsLoading, postsError, mutatePosts]);

  // Add the getDirectS3Url function local to the component
  const getDirectS3Url = (imageKey: string) => {
    if (!imageKey) return '';
    return `${process.env.NEXT_PUBLIC_API_URL || ''}/api/images/${encodeURIComponent(imageKey)}`;
  };

  // Render posts based on authentication status
  const renderPosts = () => {
    if (isAuthenticated) {
      if (postsError) {
        return (
          <div className="text-center py-10 text-red-500">
            Error loading posts. Please try again.
            <button 
              onClick={refreshPosts}
              className="block mx-auto mt-4 px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        );
      }
      
      if (allPosts.length === 0 && !loading) {
        return (
          <div className="text-center py-10 text-zinc-500">
            No posts found. Be the first to create a post!
          </div>
        );
      }
      
      return allPosts.map((post) => {
        // Ensure user data has fallbacks for missing properties
        const user = post.user || {};
        const username = user.username || user.name || 'User';
        
        // Helper function to get direct S3 URL - defined inline to avoid import issues
        const getS3Url = (key: string) => {
          return `${process.env.NEXT_PUBLIC_API_URL || ''}/api/images/${encodeURIComponent(key)}`;
        };
        
        // Prioritize imageKey over image
        const userAvatar = user.imageKey 
          ? getS3Url(user.imageKey) 
          : (user.image || `https://picsum.photos/seed/avatar${post._id}/150/150`);
        
        return (
          <Post
            key={post._id}
            username={username}
            userAvatar={userAvatar}
            timeAgo={formatTimeAgo(post.createdAt)}
            image={post.imageUrl}
            likes={post.likes.length}
            caption={post.caption || ''}
            isAutoGenerated={false}
            postData={post}
            onPostUpdate={handlePostUpdate}
          />
        );
      });
    } else {
      return generatedPosts.map((post, index) => (
        <Post
          key={`generated-${index}-${post.image}`}
          {...post}
          isAutoGenerated={true}
        />
      ));
    }
  };

  // Pull to refresh functionality
  const handleRefresh = () => {
    if (isAuthenticated) {
      refreshPosts();
    } else {
      const freshPosts = generatePosts(0);
      setGeneratedPosts(freshPosts);
      setGeneratedPage(1);
    }
  };

  return (
    <FeedProvider refreshFeed={refreshPosts} mutateFeed={mutatePosts}>
      <div className="flex-1 overflow-auto px-4">
        <div className="max-w-[500px] mx-auto py-8">
          {status === 'loading' || (isAuthenticated && isPostsLoading && allPosts.length === 0) ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              <div className="grid gap-8">
                {renderPosts()}
              </div>
              <div
                ref={loadMoreRef}
                className="h-20 flex items-center justify-center text-zinc-500"
              >
                {loading || (isAuthenticated && isPostsLoading && allPosts.length > 0) ? (
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading more posts...</span>
                  </div>
                ) : (
                  <span>
                    {isAuthenticated && !hasMorePosts && allPosts.length > 0
                      ? 'No more posts' 
                      : 'Scroll for more'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </FeedProvider>
  );
} 