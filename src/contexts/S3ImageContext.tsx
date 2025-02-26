'use client';

import { createContext, useContext, ReactNode } from 'react';

// Create a context with the invalidateImages function for backward compatibility
const S3ImageContext = createContext<{
  invalidateImages: () => void;
}>({
  invalidateImages: () => {} // No-op function
});

interface S3ImageProviderProps {
  children: ReactNode;
}

export function S3ImageProvider({ children }: S3ImageProviderProps) {
  // We're keeping the provider for backward compatibility
  // but it now includes the invalidateImages function as a no-op
  return (
    <S3ImageContext.Provider value={{ 
      invalidateImages: () => {
        console.log('S3ImageContext.invalidateImages called (no-op)');
      } 
    }}>
      {children}
    </S3ImageContext.Provider>
  );
}

export function useS3ImageContext() {
  return useContext(S3ImageContext);
} 