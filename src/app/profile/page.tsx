'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/instagram/Sidebar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePosts } from '@/components/profile/ProfilePosts';
import { Loader2 } from 'lucide-react';
import { User } from '@/types/user';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const userData = await response.json();
        setUser(userData);

        // Fetch post count
        const postsResponse = await fetch('/api/user/posts?limit=1');
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPostCount(postsData.pagination.total);
        }
      } catch (error: any) {
        setError(error.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchUserProfile();
    }
  }, [status]);

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen bg-black text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex h-screen bg-black text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-zinc-400">
            <p>{error || 'Failed to load profile'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <ProfileHeader 
            user={user} 
            postCount={postCount}
            onProfileUpdate={handleProfileUpdate}
          />
          <ProfilePosts userId={user._id} />
        </div>
      </div>
    </div>
  );
} 