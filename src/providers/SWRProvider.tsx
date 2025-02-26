'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

type SWRProviderProps = {
  children: ReactNode;
};

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        fetcher: (url: string) => fetch(url).then(res => res.json()),
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000, // 5 seconds
        errorRetryCount: 3,
        shouldRetryOnError: true,
        // Add a loading delay to prevent flickering
        loadingTimeout: 3000,
      }}
    >
      {children}
    </SWRConfig>
  );
} 