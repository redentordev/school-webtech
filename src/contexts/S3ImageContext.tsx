'use client';

import { createContext, useContext, ReactNode } from 'react';

// Create an empty context since we no longer need to manage presigned URLs
const S3ImageContext = createContext<{}>({});

interface S3ImageProviderProps {
  children: ReactNode;
}

export function S3ImageProvider({ children }: S3ImageProviderProps) {
  // We're keeping the provider for backward compatibility
  // but it no longer needs to do anything special
  return (
    <S3ImageContext.Provider value={{}}>
      {children}
    </S3ImageContext.Provider>
  );
}

export function useS3ImageContext() {
  return useContext(S3ImageContext);
} 