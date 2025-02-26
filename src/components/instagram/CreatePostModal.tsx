'use client';

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFeedContext } from "@/contexts/FeedContext";
import { FeedResponse } from "@/hooks/useFeed";
import { KeyedMutator } from "swr";
import { useS3ImageContext } from "@/contexts/S3ImageContext";

interface FeedContextType {
  refreshFeed: () => void;
  mutateFeed: KeyedMutator<FeedResponse>;
}

interface S3ImageContextType {
  registerMutator: (key: string, mutate: KeyedMutator<any>) => void;
  unregisterMutator: (key: string) => void;
  invalidateImages: () => void;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get feed refresh function from context
  let feedContext: FeedContextType | undefined;
  try {
    feedContext = useFeedContext();
  } catch (error) {
    // Context not available, will handle gracefully
  }
  
  // Get S3Image context for invalidating image cache
  let s3ImageContext: S3ImageContextType | undefined;
  try {
    s3ImageContext = useS3ImageContext();
  } catch (error) {
    // Context not available, will handle gracefully
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);
    setError("");

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
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      setError("Please select an image");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      // Step 1: Get a presigned URL for uploading the image
      const response = await fetch("/api/posts/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileType: imageFile.type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to get upload URL");
      }

      const { uploadURL, key } = await response.json();

      // Step 2: Upload the image to S3 using the presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": imageFile.type,
        },
        body: imageFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Step 3: Create the post with the image key
      const createPostResponse = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption,
          imageKey: key,
        }),
      });

      if (!createPostResponse.ok) {
        const data = await createPostResponse.json();
        throw new Error(data.message || "Failed to create post");
      }

      // Reset form and close modal
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      
      // Refresh the feed to show the new post
      if (feedContext) {
        feedContext.refreshFeed();
      }
      
      // Invalidate S3Image cache to refresh profile gallery
      if (s3ImageContext) {
        s3ImageContext.invalidateImages();
      }
      
      router.refresh();
      onClose();
    } catch (error: any) {
      setError(error.message || "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDialogClose = () => {
    if (!isUploading) {
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Post</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="caption" className="text-sm text-gray-300">
              Caption
            </Label>
            <Textarea
              id="caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white resize-none h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image" className="text-sm text-gray-300">
              Image
            </Label>
            
            {imagePreview ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-md border border-zinc-700">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-zinc-700 rounded-md cursor-pointer bg-zinc-800 hover:bg-zinc-700"
              >
                <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">Click to upload an image</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              </div>
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

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <Button
            type="submit"
            disabled={isUploading || !imageFile}
            variant="default"
            className="w-full bg-zinc-800 text-white hover:bg-zinc-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Share Post"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 