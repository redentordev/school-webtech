'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/instagram/Sidebar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePosts } from '@/components/profile/ProfilePosts';
import { Loader2 } from 'lucide-react';
import { User } from '@/types/user';
import { fetchUserProfile } from '@/lib/profile-utils';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Use our new utility function that tries multiple methods to get the profile
        const userData = await fetchUserProfile();
        console.log('Profile data loaded successfully', userData);
        
        // Ensure user data has required fields
        if (!userData) {
          throw new Error('No user data returned');
        }
        
        // If username is missing, make sure there's at least a name as fallback
        if (!userData.username && !userData.name) {
          const email = userData.email || (session?.user?.email as string);
          userData.name = email ? email.split('@')[0] : 'User';
        }
        
        setUser(userData);

        // Fetch post count
        const postsResponse = await fetch('/api/user/posts?limit=1');
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPostCount(postsData.pagination.total);
        }
      } catch (error: any) {
        console.error('Failed to load profile:', error);
        setError(error.message || 'Something went wrong');
        
        // If we haven't retried too many times, retry after a delay
        if (retryCount < 2) {
          const timer = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setError(''); // Clear error to trigger retry
          }, 2000);
          
          return () => clearTimeout(timer);
        }
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated' && (error === '' || retryCount > 0)) {
      loadUserData();
    }
  }, [status, error, retryCount, session]);

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
            {retryCount < 2 && (
              <button 
                onClick={() => setRetryCount(prev => prev + 1)}
                className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
              >
                Retry
              </button>
            )}
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