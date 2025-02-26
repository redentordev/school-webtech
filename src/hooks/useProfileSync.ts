'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface SyncStatus {
  syncing: boolean;
  error: string | null;
  lastSynced: Date | null;
  retryCount: number;
}

/**
 * Custom hook to synchronize user profiles after OAuth login
 * This is particularly useful to ensure all required user data 
 * is correctly populated in the database
 */
export default function useProfileSync() {
  const { data: session, status, update: updateSession } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    error: null,
    lastSynced: null,
    retryCount: 0
  });

  // Memoize syncProfile to avoid recreation on each render
  const syncProfile = useCallback(async () => {
    if (!session?.user) return;

    try {
      setSyncStatus(prev => ({ 
        ...prev, 
        syncing: true, 
        error: null 
      }));
      
      console.log("Syncing user profile...");
      const response = await fetch("/api/auth/sync-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to sync profile");
      }

      console.log("Profile sync successful:", data.user);
      
      // Update the session with the new user data
      if (data.user) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            ...data.user
          }
        });
        console.log("Session updated with synced profile data");
      }
      
      // Update the sync status
      setSyncStatus({
        syncing: false,
        error: null,
        lastSynced: new Date(),
        retryCount: 0 // Reset retry count on success
      });

      return data.user;
    } catch (error) {
      console.error("Error syncing profile:", error);
      setSyncStatus(prev => ({
        syncing: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        lastSynced: null,
        retryCount: prev.retryCount + 1
      }));
    }
  }, [session, updateSession]);

  // Sync the profile when the session is available
  useEffect(() => {
    // Don't sync if we don't have a session yet or if we're not authenticated
    if (status !== "authenticated" || !session?.user) return;
    
    // Only sync if we have no username or we've had an error but haven't retried too many times
    const needsSync = !(session.user as any)?.username;
    const shouldRetry = syncStatus.error && syncStatus.retryCount < 3;
    
    if (needsSync || shouldRetry) {
      // Add a small delay to ensure any database operations have settled
      const timer = setTimeout(() => {
        syncProfile();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [session, status, syncProfile, syncStatus.error, syncStatus.retryCount]);

  // Don't retry more than 3 times automatically
  useEffect(() => {
    if (syncStatus.error && syncStatus.retryCount <= 3) {
      const retryDelay = Math.min(2000 * Math.pow(2, syncStatus.retryCount - 1), 10000);
      
      console.log(`Will retry profile sync in ${retryDelay}ms (attempt ${syncStatus.retryCount})`);
      
      const timer = setTimeout(() => {
        if (syncStatus.retryCount <= 3) {
          console.log(`Retrying profile sync (attempt ${syncStatus.retryCount})`);
          syncProfile();
        }
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [syncStatus.error, syncStatus.retryCount, syncProfile]);

  return {
    ...syncStatus,
    syncProfile
  };
} 