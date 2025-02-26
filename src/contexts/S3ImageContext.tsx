'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useRef } from 'react';
import { KeyedMutator } from 'swr';

interface S3ImageContextType {
  registerMutator: (key: string, mutate: KeyedMutator<any>) => void;
  unregisterMutator: (key: string) => void;
  invalidateImages: () => void;
}

const S3ImageContext = createContext<S3ImageContextType | undefined>(undefined);

interface S3ImageProviderProps {
  children: ReactNode;
}

export function S3ImageProvider({ children }: S3ImageProviderProps) {
  // Use a ref instead of state to store mutators to avoid re-renders
  const mutatorsRef = useRef<Map<string, KeyedMutator<any>>>(new Map());

  // Register a mutate function for a specific image key
  const registerMutator = useCallback((key: string, mutate: KeyedMutator<any>) => {
    mutatorsRef.current.set(key, mutate);
  }, []);

  // Unregister a mutate function
  const unregisterMutator = useCallback((key: string) => {
    mutatorsRef.current.delete(key);
  }, []);

  // Invalidate all registered images
  const invalidateImages = useCallback(() => {
    console.log(`Invalidating ${mutatorsRef.current.size} S3 images`);
    mutatorsRef.current.forEach((mutate, key) => {
      console.log(`Revalidating image with key: ${key}`);
      mutate();
    });
  }, []);

  // Create a stable context value
  const contextValue = useCallback(() => ({
    registerMutator,
    unregisterMutator,
    invalidateImages
  }), [registerMutator, unregisterMutator, invalidateImages]);

  return (
    <S3ImageContext.Provider value={contextValue()}>
      {children}
    </S3ImageContext.Provider>
  );
}

export function useS3ImageContext() {
  const context = useContext(S3ImageContext);
  if (context === undefined) {
    throw new Error('useS3ImageContext must be used within an S3ImageProvider');
  }
  return context;
} 