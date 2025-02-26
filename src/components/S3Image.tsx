'use client';

import { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { useS3Image } from '@/hooks/useS3Image';
import { Loader2, ImageIcon } from 'lucide-react';
import { KeyedMutator } from 'swr';
import { useS3ImageContext } from '@/contexts/S3ImageContext';

// Import the context type
interface S3ImageContextType {
  registerMutator: (key: string, mutate: KeyedMutator<any>) => void;
  unregisterMutator: (key: string) => void;
  invalidateImages: () => void;
}

interface S3ImageProps extends Omit<ImageProps, 'src'> {
  imageKey: string;
  fallbackSrc?: string;
  showLoadingSpinner?: boolean;
  onMutateRef?: (mutate: KeyedMutator<any>) => void;
}

export function S3Image({ 
  imageKey, 
  fallbackSrc = '', 
  alt = 'Image',
  className,
  showLoadingSpinner = true,
  onMutateRef,
  ...props 
}: S3ImageProps) {
  const { url, isLoading, error, mutate } = useS3Image(imageKey);
  const [isImageError, setIsImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  
  // Try to use the S3ImageContext if available
  let s3ImageContext: S3ImageContextType | undefined;
  try {
    s3ImageContext = useS3ImageContext();
  } catch (error) {
    // Context not available, will handle gracefully
  }

  // Register this image with the context when mounted, unregister when unmounted
  useEffect(() => {
    if (s3ImageContext && imageKey && mutate) {
      s3ImageContext.registerMutator(imageKey, mutate);
      
      return () => {
        s3ImageContext.unregisterMutator(imageKey);
      };
    }
  }, [imageKey, mutate, s3ImageContext]);

  // Expose the mutate function to parent components if needed
  useEffect(() => {
    if (onMutateRef && mutate) {
      onMutateRef(mutate);
    }
  }, [mutate, onMutateRef]);

  // Debug the URL when it changes
  useEffect(() => {
    if (url) {
      console.log(`Rendering image with key ${imageKey}`);
      console.log(`Image URL (first 50 chars): ${url.substring(0, 50)}...`);
    } else if (imageKey) {
      console.log(`No URL available yet for image key: ${imageKey}`);
    }
  }, [url, imageKey]);
  
  // Generate direct URL once as fallback after S3 presigned URL fails
  useEffect(() => {
    if (isImageError && !directUrl && !shouldUseFallback) {
      console.log(`Presigned URL failed for ${imageKey}, trying direct URL as fallback`);
      
      // Generate direct public URL as fallback
      const region = 'us-east-1'; // Your S3 region
      const bucket = 'picwall-webtech'; // Your bucket name
      const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
      const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
      
      console.log(`Using direct URL fallback: ${publicUrl}`);
      setDirectUrl(publicUrl);
    }
  }, [isImageError, directUrl, imageKey, shouldUseFallback]);

  // Handle image load error for presigned URL
  const handleError = () => {
    console.error(`Failed to load image with key: ${imageKey}`);
    setIsImageError(true);
  };

  // Handle direct URL error - if this fails, go to fallback UI
  const handleDirectUrlError = () => {
    console.error(`Direct URL also failed for image: ${imageKey}`);
    setShouldUseFallback(true);
  };

  // Handle image load complete
  const handleLoad = () => {
    setIsImageLoaded(true);
  };

  // Show loading state from the hook (fetching the URL)
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-sm ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Try direct URL if presigned URL has failed
  if (directUrl && !shouldUseFallback) {
    return (
      <div className="relative w-full h-full">
        {showLoadingSpinner && !isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/70 z-10 rounded-sm">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        
        <Image
          src={directUrl}
          alt={alt}
          className={className}
          onError={handleDirectUrlError}
          onLoad={handleLoad}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={80}
          unoptimized={false}
          {...props}
        />
      </div>
    );
  }

  // Show error or fallback if both presigned and direct URLs failed
  if (error || shouldUseFallback || !url) {
    if (fallbackSrc) {
      return <Image src={fallbackSrc} alt={alt} className={className} {...props} />;
    }
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-800 border border-zinc-700 rounded-sm ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
        <span className="text-zinc-400 text-xs text-center px-2">
          {error || 'Image not available'}
        </span>
      </div>
    );
  }

  // Show the image with the presigned URL
  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {showLoadingSpinner && !isImageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/70 z-10 rounded-sm">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      
      <Image
        src={url}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={80}
        unoptimized={false}
        {...props}
      />
    </div>
  );
} 