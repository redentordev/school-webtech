'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EditProfileModal } from './EditProfileModal';
import { User } from '@/types/user';
import { SettingsIcon } from 'lucide-react';
import Image from 'next/image';

interface ProfileHeaderProps {
  user: User;
  postCount: number;
  onProfileUpdate: (updatedUser: User) => void;
}

export function ProfileHeader({ user, postCount, onProfileUpdate }: ProfileHeaderProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Generate direct S3 URL for an image
  const getDirectS3Url = (imageKey: string) => {
    const region = 'us-east-1';
    const bucket = 'picwall-webtech'; 
    const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  };

  return (
    <div className="p-6 border-b border-zinc-800">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Profile Image */}
        <div className="relative">
          {user.imageKey ? (
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full overflow-hidden relative">
              <Image 
                src={getDirectS3Url(user.imageKey)}
                alt={user.name || 'User'}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Avatar className="w-24 h-24 md:w-36 md:h-36">
              <AvatarFallback className="text-2xl bg-zinc-800">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <h1 className="text-xl font-semibold">
              {user.username || user.name}
            </h1>
            <Button 
              variant="outline" 
              size="sm"
              className="border-zinc-700 text-black hover:bg-zinc-800"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>
          </div>

          <div className="flex justify-center md:justify-start space-x-8">
            <div>
              <span className="font-semibold">{postCount}</span>{' '}
              <span className="text-zinc-400">posts</span>
            </div>
          </div>

          {user.bio && (
            <div className="max-w-md">
              <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
} 