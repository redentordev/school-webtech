'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaImage } from 'react-icons/fa';

export function CreatePost() {
  const [image, setImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      setError('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'picwall_uploads');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setImage(data.secure_url);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      setError('Please upload an image');
      return;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      // Close dialog and refresh feed
      window.location.reload();
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {image ? (
          <div className="relative aspect-square rounded-md overflow-hidden">
            <Image
              src={image}
              alt="Upload preview"
              fill
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setImage('')}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-zinc-800 rounded-lg">
            <FaImage className="w-8 h-8 text-zinc-500" />
            <div className="text-center">
              <Label htmlFor="image-upload" className="cursor-pointer text-zinc-400 hover:text-white">
                Upload a photo
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={!image || uploading}
        >
          {uploading ? 'Uploading...' : 'Post'}
        </Button>
      </div>
    </form>
  );
} 