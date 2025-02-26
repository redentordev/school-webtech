'use client';

import { createContext, useContext, ReactNode } from 'react';
import { KeyedMutator } from 'swr';
import { FeedResponse } from '@/hooks/useFeed';

interface FeedContextType {
  refreshFeed: () => void;
  mutateFeed: KeyedMutator<FeedResponse>;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

interface FeedProviderProps {
  children: ReactNode;
  refreshFeed: () => void;
  mutateFeed: KeyedMutator<FeedResponse>;
}

export function FeedProvider({ children, refreshFeed, mutateFeed }: FeedProviderProps) {
  return (
    <FeedContext.Provider value={{ refreshFeed, mutateFeed }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeedContext() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error('useFeedContext must be used within a FeedProvider');
  }
  return context;
}