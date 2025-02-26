'use client';

import { useState, useRef } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/types/user';
import { UserIcon } from 'lucide-react';
import Image from 'next/image';
import { getDirectS3Url } from '@/lib/image-utils';

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
    imageKey: user.imageKey || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Handle image upload if there's a new image
      let updatedImageKey = user.imageKey;
      
      if (imageFile) {
        // Create a FormData object to send the file
        const uploadData = new FormData();
        uploadData.append('file', imageFile);
        
        // Upload the image to S3 via your API
        const uploadResponse = await fetch('/api/user/profile/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileType: imageFile.type
          }),
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadResult = await uploadResponse.json();
        
        // Now we have a presigned URL, upload the actual file to S3
        const { uploadURL, key } = uploadResult;
        
        const s3UploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          headers: {
            'Content-Type': imageFile.type
          },
          body: imageFile
        });
        
        if (!s3UploadResponse.ok) {
          throw new Error('Failed to upload image to storage');
        }
        
        // Update the image key
        updatedImageKey = key;
        
        // Update the image key in the database
        const updateImageKeyResponse = await fetch('/api/user/profile/image', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageKey: key,
          }),
        });
        
        if (!updateImageKeyResponse.ok) {
          throw new Error('Failed to update profile image');
        }
      }
      
      // Update the user profile
      const response = await fetch(`/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageKey: updatedImageKey,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      // The updated user is in the 'user' property of the response
      const updatedUser = data.user;
      onProfileUpdate(updatedUser);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
                ) : formData.imageKey ? (
                  <Image 
                    src={getDirectS3Url(formData.imageKey)} 
                    alt={formData.name || 'User'} 
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-zinc-800 text-lg">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="text-sm border-zinc-700 hover:bg-zinc-800"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-gray-300">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 focus-visible:ring-zinc-600"
            />
          </div>
          
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-gray-300">Username</Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 focus-visible:ring-zinc-600"
            />
          </div>
          
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm text-gray-300">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="bg-zinc-800 border-zinc-700 focus-visible:ring-zinc-600 min-h-[100px]"
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-zinc-700 hover:bg-zinc-800 text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 