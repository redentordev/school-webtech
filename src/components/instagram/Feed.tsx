'use client';

import { useEffect, useState, useRef } from 'react';
import { faker } from '@faker-js/faker';
import { Post } from './Post';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useFeed, RealPost } from '@/hooks/useFeed';
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

export function Feed() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  // State for generated posts (non-authenticated users)
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [generatedPage, setGeneratedPage] = useState(0);
  
  // Use custom hook for real posts
  const { 
    posts: realPosts, 
    error: feedError, 
    isLoading: isFeedLoading, 
    loadMore: loadMoreRealPosts,
    hasMore: hasMoreRealPosts,
    refresh: refreshFeed,
    mutate: mutateFeed
  } = useFeed(isAuthenticated);
  
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
        if (hasMoreRealPosts) {
          loadMoreRealPosts();
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
  }, [loading, isAuthenticated, generatedPage, hasMoreRealPosts, loadMoreRealPosts]);

  // Handle post update (likes, comments)
  const handlePostUpdate = (updatedPost: RealPost) => {
    // Update the post in the list
    const updatedPosts = realPosts.map(post => 
      post._id === updatedPost._id ? updatedPost : post
    );
    
    // Update the cache with the new data
    mutateFeed(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: updatedPosts
      };
    }, false); // Don't revalidate immediately
  };

  // Render posts based on authentication status
  const renderPosts = () => {
    if (isAuthenticated) {
      if (feedError) {
        return (
          <div className="text-center py-10 text-red-500">
            Error loading posts. Please try again.
            <button 
              onClick={refreshFeed}
              className="block mx-auto mt-4 px-4 py-2 bg-zinc-800 rounded-md hover:bg-zinc-700 transition"
            >
              Retry
            </button>
          </div>
        );
      }

      if (realPosts.length === 0 && !isFeedLoading) {
        return (
          <div className="text-center py-10 text-zinc-500">
            No posts found. Follow users to see their posts in your feed.
          </div>
        );
      }
      
      return realPosts.map((post) => (
        <Post
          key={post._id}
          username={post.user.username || post.user.name}
          userAvatar={post.user.image || `https://picsum.photos/seed/avatar${post._id}/150/150`}
          timeAgo={formatTimeAgo(post.createdAt)}
          image={post.imageUrl}
          likes={post.likes.length}
          caption={post.caption || ''}
          isAutoGenerated={false}
          postData={post}
          onPostUpdate={handlePostUpdate}
        />
      ));
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

  // Pull to refresh functionality (for future implementation)
  const handleRefresh = () => {
    if (isAuthenticated) {
      refreshFeed();
    } else {
      const freshPosts = generatePosts(0);
      setGeneratedPosts(freshPosts);
      setGeneratedPage(1);
    }
  };

  return (
    <FeedProvider refreshFeed={refreshFeed} mutateFeed={mutateFeed}>
      <div className="flex-1 overflow-auto px-4">
        <div className="max-w-[500px] mx-auto py-8">
          {status === 'loading' || (isAuthenticated && isFeedLoading && realPosts.length === 0) ? (
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
                {loading || (isAuthenticated && isFeedLoading && realPosts.length > 0) ? (
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading more posts...</span>
                  </div>
                ) : (
                  <span>
                    {isAuthenticated && !hasMoreRealPosts && realPosts.length > 0
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