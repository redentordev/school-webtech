'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaRegHeart, FaHeart, FaRegComment } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FeedPostModal } from "./FeedPostModal";
import { S3Image } from "@/components/S3Image";
import { getDirectS3Url, getUserAvatarUrl } from '@/lib/image-utils';

// Type for auto-generated posts
type GeneratedPost = {
  username: string;
  userAvatar: string;
  timeAgo: string;
  image: string;
  likes: number;
  caption: string;
  isAutoGenerated?: boolean;
};

// Type for real posts
type RealPost = {
  _id: string;
  user: {
    _id: string;
    name: string;
    username?: string;
    image?: string;
    imageKey?: string;
  };
  caption?: string;
  imageUrl: string;
  imageKey: string;
  likes: string[];
  comments: {
    _id: string;
    user: {
      _id: string;
      name: string;
      username?: string;
      image?: string;
      imageKey?: string;
    } | string;
    text: string;
    content?: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type PostProps = {
  username: string;
  userAvatar: string;
  timeAgo: string;
  image: string;
  likes: number;
  caption: string;
  isAutoGenerated?: boolean;
  postData?: RealPost; // Optional real post data for authenticated users
  onPostUpdate?: (updatedPost: RealPost) => void; // Callback for updating post data
};

export function Post({ 
  username, 
  userAvatar, 
  timeAgo, 
  image, 
  likes, 
  caption, 
  isAutoGenerated = false,
  postData,
  onPostUpdate
}: PostProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(likes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const currentUserId = session?.user?.id;
  const isAuthenticated = !!currentUserId;

  // Check if the post is liked by the current user
  useEffect(() => {
    if (currentUserId && postData) {
      setIsLiked(postData.likes.includes(currentUserId));
      setLikesCount(postData.likes.length);
    }
  }, [postData, currentUserId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    
    if (!isAuthenticated || isAutoGenerated) return;
    
    if (postData) {
      try {
        const response = await fetch(`/api/posts/${postData._id}/like`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to like post');
        }

        const data = await response.json();
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
        
        // Update the post with new likes
        if (onPostUpdate) {
          onPostUpdate({
            ...postData,
            likes: data.liked 
              ? [...postData.likes, currentUserId] 
              : postData.likes.filter(id => id !== currentUserId)
          });
        }
      } catch (error: any) {
        console.error('Error liking post:', error);
      }
    }
  };

  const handlePostClick = () => {
    if (!isAutoGenerated && isAuthenticated && postData) {
      setIsModalOpen(true);
    }
  };

  const handlePostUpdate = (updatedPost: RealPost) => {
    if (onPostUpdate) {
      onPostUpdate(updatedPost);
    }
  };

  return (
    <>
      <div 
        className={`bg-zinc-900 rounded-lg overflow-hidden ${!isAutoGenerated && isAuthenticated ? 'cursor-pointer' : ''}`}
        onClick={handlePostClick}
      >
        {/* Image */}
        <div className="aspect-square relative">
          {isAutoGenerated ? (
            // For auto-generated posts, use the regular Next.js Image component
            <Image
              src={image}
              alt="Post content"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
              loading="lazy"
              quality={75}
            />
          ) : postData ? (
            // For real posts, use Next.js Image with direct S3 URL
            <Image
              src={postData.imageKey ? getDirectS3Url(postData.imageKey) : image}
              alt="Post content"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
              loading="lazy"
              quality={75}
            />
          ) : (
            // Fallback if somehow neither condition is met
            <Image
              src={image}
              alt="Post content"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
              loading="lazy"
              quality={75}
            />
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              {postData && postData.user.imageKey ? (
                <AvatarImage src={getDirectS3Url(postData.user.imageKey)} alt={username} />
              ) : (
                <AvatarImage src={userAvatar} alt={username} />
              )}
              <AvatarFallback>{username && username.length > 0 ? username[0].toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{username}</p>
              <p className="text-xs text-zinc-400">{timeAgo}</p>
            </div>
            
            {/* Auto-generated badge */}
            {isAutoGenerated && (
              <div className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                Auto-generated
              </div>
            )}
          </div>

          {/* Like button and count */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              onClick={handleLike}
            >
              {isLiked ? (
                <FaHeart className="w-5 h-5 text-red-500" />
              ) : (
                <FaRegHeart className="w-5 h-5" />
              )}
            </Button>
            <span className="text-sm">{likesCount.toLocaleString()} likes</span>
            
            {!isAutoGenerated && isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
              >
                <FaRegComment className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Caption */}
          {caption && (
            <p className="text-sm">
              <span className="font-medium">{username && username.length > 0 ? username : 'User'}</span>{' '}
              {caption}
            </p>
          )}
          
          {/* Login prompt for auto-generated posts */}
          {isAutoGenerated && (
            <div className="text-xs text-zinc-400 mt-2 border-t border-zinc-800 pt-2">
              <Link href="/login" className="text-blue-500 hover:underline">
                Log in
              </Link> to see real posts from users.
            </div>
          )}
        </div>
      </div>

      {/* Post Modal */}
      {postData && (
        <>
          {/* Debug console log just before opening modal */}
          {console.log('Opening FeedPostModal with post:', postData)}
          {console.log('Post has comments:', postData.comments)}
          <FeedPostModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            post={postData}
            onPostUpdate={handlePostUpdate}
            isFeedContext={true}
          />
        </>
      )}
    </>
  );
} 