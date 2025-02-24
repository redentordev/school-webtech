'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type Post = {
  _id: string;
  image: string;
  caption: string;
  likes: string[];
  comments: any[];
};

export default function ProfileGallery() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPosts();
  }, []);

  const fetchUserPosts = async () => {
    try {
      const response = await fetch('/api/posts/user');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
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

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Share Photos
        </h3>
        <p className="text-gray-500 mb-6">
          When you share photos, they will appear on your profile.
        </p>
        <Link
          href="/create"
          className="text-blue-500 font-semibold hover:text-blue-600"
        >
          Share your first photo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 mt-4">
      {posts.map((post) => (
        <div
          key={post._id}
          className="relative aspect-square group cursor-pointer"
        >
          <Image
            src={post.image}
            alt={post.caption}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center space-x-6">
            <div className="hidden group-hover:flex items-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="ml-1 font-semibold">{post.likes.length}</span>
            </div>
            <div className="hidden group-hover:flex items-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
              </svg>
              <span className="ml-1 font-semibold">{post.comments.length}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 