'use client';

import { useEffect, useState } from 'react';
import Post from './Post';

type Post = {
  _id: string;
  image: string;
  caption: string;
  user: {
    _id: string;
    name: string;
    username: string;
    profilePicture: string;
  };
  likes: string[];
  comments: {
    _id: string;
    user: {
      _id: string;
      name: string;
      username: string;
      profilePicture: string;
    };
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
};

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <Post key={post._id} post={post} onPostUpdate={fetchPosts} />
      ))}
    </div>
  );
} 