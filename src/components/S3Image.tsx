'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { ImageIcon, Loader2 } from 'lucide-react';

interface S3ImageProps extends Omit<ImageProps, 'src'> {
  imageKey: string;
  fallbackSrc?: string;
  showLoadingSpinner?: boolean;
}

export function S3Image({ 
  imageKey, 
  fallbackSrc = '', 
  alt = 'Image',
  className,
  showLoadingSpinner = true,
  ...props 
}: S3ImageProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  
  // Generate direct S3 bucket URL
  const region = 'us-east-1'; // S3 region
  const bucket = 'picwall-webtech'; // S3 bucket name
  const encodedKey = encodeURIComponent(imageKey).replace(/%2F/g, '/');
  const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  
  // Handle image load error
  const handleError = () => {
    console.error(`Failed to load image with key: ${imageKey}`);
    setIsImageError(true);
  };

  // Handle image load complete
  const handleLoad = () => {
    setIsImageLoaded(true);
  };

  // Show error or fallback if image failed to load
  if (isImageError) {
    if (fallbackSrc) {
      return <Image src={fallbackSrc} alt={alt} className={className} {...props} />;
    }
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-800 border border-zinc-700 rounded-sm ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
        <span className="text-zinc-400 text-xs text-center px-2">
          Image not available
        </span>
      </div>
    );
  }

  // Show the image with direct S3 URL
  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {showLoadingSpinner && !isImageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/70 z-10 rounded-sm">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      
      <Image
        src={directUrl}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={80}
        {...props}
      />
    </div>
  );
} 