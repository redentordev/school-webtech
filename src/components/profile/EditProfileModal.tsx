'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { User } from '@/types/user';
import { S3Image } from '@/components/S3Image';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdate: (updatedUser: User) => void;
}

export function EditProfileModal({ isOpen, onClose, user, onProfileUpdate }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    username: user.username || '',
    bio: user.bio || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    setError('');

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      setError('');

      let updatedUser = { ...user };

      // Update profile info
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!profileResponse.ok) {
        const data = await profileResponse.json();
        throw new Error(data.message || 'Failed to update profile');
      }

      const profileData = await profileResponse.json();
      updatedUser = profileData.user;

      // If there's a new image, upload it
      if (imageFile) {
        console.log('Starting image upload process...');
        
        try {
          // Step 1: Get a presigned URL for uploading the image
          console.log('Requesting presigned URL for file type:', imageFile.type);
          const urlResponse = await fetch('/api/user/profile/image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileType: imageFile.type }),
          });

          if (!urlResponse.ok) {
            const data = await urlResponse.json();
            console.error('Failed to get upload URL:', data);
            throw new Error(data.message || 'Failed to get upload URL');
          }

          const { uploadURL, key } = await urlResponse.json();
          console.log('Received presigned URL and key:', { key });

          // Step 2: Upload the image to S3 using the presigned URL
          console.log('Uploading image to S3...');
          const uploadResponse = await fetch(uploadURL, {
            method: 'PUT',
            headers: {
              'Content-Type': imageFile.type,
            },
            body: imageFile,
          });

          if (!uploadResponse.ok) {
            console.error('S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
            throw new Error(`Failed to upload image: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }
          
          console.log('Image uploaded successfully to S3');

          // Step 3: Update the profile with the new image key
          console.log('Updating user profile with new image key:', key);
          const imageResponse = await fetch('/api/user/profile/image', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageKey: key }),
          });

          if (!imageResponse.ok) {
            const data = await imageResponse.json();
            console.error('Failed to update profile image:', data);
            throw new Error(data.message || 'Failed to update profile image');
          }

          const imageData = await imageResponse.json();
          console.log('Profile image updated successfully:', imageData);
          updatedUser = imageData.user;
        } catch (uploadError: any) {
          console.error('Image upload process failed:', uploadError);
          throw new Error(uploadError.message || 'Failed to upload profile image');
        }
      }

      onProfileUpdate(updatedUser);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Image */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-sm text-gray-300">
              Profile Picture
            </Label>
            
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden">
                {imagePreview ? (
                  <Image 
                    src={imagePreview} 
                    alt="Preview" 
                    fill 
                    className="object-cover"
                    unoptimized={true}
                  />
                ) : user.imageKey ? (
                  <S3Image 
                    imageKey={user.imageKey}
                    alt={user.name || 'User'}
                    fill
                    className="object-cover"
                    fallbackSrc="/images/default-avatar.png"
                  />
                ) : (
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-zinc-800 text-lg">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-white hover:bg-zinc-800"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-gray-300">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-gray-300">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm text-gray-300">
              Bio
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 text-white resize-none h-24"
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-white hover:bg-zinc-800"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading}
            variant="default"
            className="bg-zinc-800 text-white hover:bg-zinc-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 