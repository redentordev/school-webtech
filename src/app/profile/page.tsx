import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileGallery from '@/components/profile/ProfileGallery';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <ProfileHeader />
      <div className="mt-8 border-t">
        <ProfileGallery />
      </div>
    </div>
  );
} 