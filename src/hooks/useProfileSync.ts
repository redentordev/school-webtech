'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface SyncStatus {
  syncing: boolean;
  error: string | null;
  lastSynced: Date | null;
  retryCount: number;
  syncComplete: boolean;
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
    retryCount: 0,
    syncComplete: false
  });

  // Memoize syncProfile to avoid recreation on each render
  const syncProfile = useCallback(async () => {
    // Don't sync if we don't have a session or if sync is already complete
    if (!session?.user) {
      console.log("Skipping profile sync - no session");
      return;
    }

    // If sync is complete but we still need username, try a GET request instead of POST
    if (syncStatus.syncComplete && !(session.user as any)?.username) {
      try {
        console.log("Trying GET request to fetch profile data...");
        const getResponse = await fetch("/api/auth/sync-profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const getData = await getResponse.json();
        
        if (getResponse.ok && getData.success && getData.user?.username) {
          console.log("Successfully retrieved profile with GET:", getData.user);
          
          // Update session with the retrieved user data
          await updateSession({
            ...session,
            user: {
              ...session.user,
              ...getData.user
            }
          });
          console.log("Session updated with GET profile data");
          
          return getData.user;
        } else {
          console.warn("GET request did not return a username, falling back to POST");
          // Fall through to POST method below
        }
      } catch (error) {
        console.error("Error fetching profile with GET:", error);
        // Fall through to POST method below
      }
    }
    
    // Normal POST profile sync logic
    if (syncStatus.syncComplete && (session.user as any)?.username) {
      console.log("Skipping profile sync - already complete");
      return;
    }

    try {
      setSyncStatus(prev => ({ 
        ...prev, 
        syncing: true, 
        error: null 
      }));
      
      console.log("Syncing user profile with POST...");
      const response = await fetch("/api/auth/sync-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // If we get a conflict error, mark sync as complete to avoid loops
        if (response.status === 409 && data.emailConflict) {
          console.warn("Email conflict detected. User exists with different ID.");
          setSyncStatus({
            syncing: false,
            error: data.message,
            lastSynced: new Date(),
            retryCount: 0,
            syncComplete: true // Mark as complete to stop retries
          });
          return;
        }
        
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
        retryCount: 0, // Reset retry count on success
        syncComplete: true // Mark as complete to avoid further syncs
      });

      return data.user;
    } catch (error) {
      console.error("Error syncing profile:", error);
      setSyncStatus(prev => ({
        syncing: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        lastSynced: null,
        retryCount: prev.retryCount + 1,
        syncComplete: false
      }));
    }
  }, [session, updateSession, syncStatus.syncComplete]);

  // Sync the profile when the session is available
  useEffect(() => {
    // Don't sync if we don't have a session yet or if we're not authenticated
    if (status !== "authenticated" || !session?.user) return;
    
    // Skip if sync is already complete
    if (syncStatus.syncComplete) {
      // Extra check: If we marked sync as complete but still don't have a username
      // (which could happen if session wasn't updated properly),
      // force one more sync attempt
      if (!(session.user as any)?.username) {
        console.log("Sync was marked complete but username still missing, trying once more");
        setSyncStatus(prev => ({
          ...prev,
          syncComplete: false,
          retryCount: 0 // Reset retry count for fresh attempt
        }));
        return;
      }
      
      console.log("Profile sync already complete, skipping");
      return;
    }
    
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
    
    // If user has username, mark sync as complete
    if ((session.user as any)?.username) {
      console.log("User already has username, marking sync as complete");
      setSyncStatus(prev => ({
        ...prev,
        syncComplete: true
      }));
    }
  }, [session, status, syncProfile, syncStatus.error, syncStatus.retryCount, syncStatus.syncComplete]);

  // Retry logic for errors - don't retry more than 3 times automatically
  useEffect(() => {
    // Skip if sync is already complete
    if (syncStatus.syncComplete) return;
    
    if (syncStatus.error && syncStatus.retryCount <= 3 && syncStatus.retryCount > 0) {
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
  }, [syncStatus.error, syncStatus.retryCount, syncProfile, syncStatus.syncComplete]);

  return {
    ...syncStatus,
    syncProfile
  };
} 