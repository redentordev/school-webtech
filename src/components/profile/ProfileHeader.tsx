'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import EditProfileModal from './EditProfileModal';

type UserProfile = {
  _id: string;
  name: string;
  username: string;
  email: string;
  profilePicture: string;
  description: string;
  followers: string[];
  following: string[];
};

export default function ProfileHeader() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  if (!profile) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-8">
      <div className="relative w-32 h-32 rounded-full overflow-hidden">
        <Image
          src={profile.profilePicture}
          alt={profile.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1">
        <div className="flex items-center space-x-4 mb-4">
          <h1 className="text-2xl font-semibold">{profile.username}</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-1 border border-gray-300 rounded font-semibold text-sm hover:bg-gray-50"
          >
            Edit Profile
          </button>
        </div>

        <div className="flex space-x-6 mb-4">
          <div>
            <span className="font-semibold">0</span>{' '}
            <span className="text-gray-500">posts</span>
          </div>
          <div>
            <span className="font-semibold">{profile.followers.length}</span>{' '}
            <span className="text-gray-500">followers</span>
          </div>
          <div>
            <span className="font-semibold">{profile.following.length}</span>{' '}
            <span className="text-gray-500">following</span>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-1">{profile.name}</h2>
          <p className="text-sm whitespace-pre-wrap">{profile.description}</p>
        </div>
      </div>

      {isModalOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsModalOpen(false)}
          onUpdate={fetchProfile}
        />
      )}
    </div>
  );
} 