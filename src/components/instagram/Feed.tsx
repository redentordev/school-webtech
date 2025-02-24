'use client';

import { useEffect, useState, useRef } from 'react';
import { faker } from '@faker-js/faker';
import { Post } from './Post';

type Post = {
  username: string;
  userAvatar: string;
  timeAgo: string;
  image: string;
  likes: number;
  caption: string;
};

// Function to generate a creative username
const generateUsername = () => {
  const styles = ['minimal', 'photo', 'creative', 'art', 'design', 'lens', 'capture'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const username = faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, '');
  return Math.random() > 0.5 ? `${username}_${randomStyle}` : `${randomStyle}.${username}`;
};

// Generate dummy posts for infinite scroll
const generatePosts = (page: number): Post[] => {
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

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load initial posts
  useEffect(() => {
    const initialPosts = generatePosts(0);
    setPosts(initialPosts);
    setPage(1);
  }, []);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const loadMore = () => {
      if (loading) return;

      setLoading(true);
      const newPosts = generatePosts(page);
      setPosts(prev => [...prev, ...newPosts]);
      setPage(prev => prev + 1);
      setLoading(false);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading, page]);

  return (
    <div className="flex-1 overflow-auto px-4">
      <div className="max-w-[500px] mx-auto py-8">
        <div className="grid gap-8">
          {posts.map((post, index) => (
            <Post key={`${index}-${post.image}`} {...post} />
          ))}
        </div>
        <div
          ref={loadMoreRef}
          className="h-20 flex items-center justify-center text-zinc-500"
        >
          {loading ? 'Loading more posts...' : 'Scroll for more'}
        </div>
      </div>
    </div>
  );
} 