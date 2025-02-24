'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

type PostProps = {
  post: {
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
  onPostUpdate: () => void;
};

export default function Post({ post, onPostUpdate }: PostProps) {
  const { data: session } = useSession();
  const [comment, setComment] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const handleLike = async () => {
    if (!session?.user || isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      onPostUpdate();
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !comment.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      const response = await fetch(`/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setComment('');
      onPostUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const isLiked = session?.user?.id && post.likes.includes(session.user.id);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 flex items-center">
        <Image
          src={post.user.profilePicture}
          alt={post.user.name}
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="ml-3">
          <p className="font-medium">{post.user.name}</p>
          <p className="text-sm text-gray-500">@{post.user.username}</p>
        </div>
      </div>

      <div className="relative aspect-square">
        <Image
          src={post.image}
          alt="Post image"
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1 ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill={isLiked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{post.likes.length}</span>
          </button>
        </div>

        <p className="mb-2">
          <span className="font-medium">{post.user.username}</span>{' '}
          {post.caption}
        </p>

        <div className="space-y-2">
          {post.comments.map((comment) => (
            <div key={comment._id} className="text-sm">
              <span className="font-medium">{comment.user.username}</span>{' '}
              {comment.text}
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleComment} className="mt-4 flex">
          <input
            type="text"
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!comment.trim() || isCommenting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
} 