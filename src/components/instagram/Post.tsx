'use client';

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaRegHeart } from "react-icons/fa";
import { Button } from "@/components/ui/button";

type PostProps = {
  username: string;
  userAvatar: string;
  timeAgo: string;
  image: string;
  likes: number;
  caption: string;
};

export function Post({ username, userAvatar, timeAgo, image, likes, caption }: PostProps) {
  return (
    <div className="bg-zinc-900 rounded-lg overflow-hidden">
      {/* Image */}
      <div className="aspect-square relative">
        <Image
          src={image}
          alt="Post content"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* User info */}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={userAvatar} />
            <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-sm">{username}</p>
            <p className="text-xs text-zinc-400">{timeAgo}</p>
          </div>
        </div>

        {/* Like button and count */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            <FaRegHeart className="w-5 h-5" />
          </Button>
          <span className="text-sm">{likes.toLocaleString()} likes</span>
        </div>

        {/* Caption */}
        {caption && (
          <p className="text-sm">
            <span className="font-medium">{username}</span>{' '}
            {caption}
          </p>
        )}
      </div>
    </div>
  );
} 