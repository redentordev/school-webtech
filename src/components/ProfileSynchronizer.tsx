'use client';

import { useSession } from "next-auth/react";
import useProfileSync from "@/hooks/useProfileSync";
import { useEffect } from "react";

/**
 * Component that handles profile synchronization after OAuth login
 * This component doesn't render anything visible - it just triggers
 * the synchronization process when needed
 */
export default function ProfileSynchronizer() {
  const { data: session, status } = useSession();
  const { syncing, error, retryCount, syncComplete, syncProfile } = useProfileSync();
  
  // Log session status changes for debugging
  useEffect(() => {
    if (status === "loading") {
      console.log("Session loading...");
    } else if (status === "authenticated") {
      console.log("User authenticated:", {
        id: session?.user?.id,
        email: session?.user?.email,
        // Check if username exists
        hasUsername: !!(session?.user as any)?.username
      });
    } else if (status === "unauthenticated") {
      console.log("User not authenticated");
    }
  }, [status, session]);

  // Log sync status changes
  useEffect(() => {
    if (syncComplete) {
      console.log("Profile sync complete - no further syncing needed");
    } else if (syncing) {
      console.log("Profile sync in progress...");
    } else if (error) {
      console.error(`Profile sync error (attempt ${retryCount}):`, error);
    }
  }, [syncing, error, retryCount, syncComplete]);

  // Manual retry if automatic retries exceed limit
  useEffect(() => {
    // Don't retry if sync is complete
    if (syncComplete) return;
    
    if (error && retryCount > 3 && session) {
      // Wait a longer time for manual retry
      const timer = setTimeout(() => {
        console.log("Last attempt to sync profile...");
        syncProfile();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, session, syncProfile, syncComplete]);

  // This component doesn't render anything
  return null;
} 