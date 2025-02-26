import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface SyncStatus {
  syncing: boolean;
  error: string | null;
  lastSynced: Date | null;
}

/**
 * Custom hook to synchronize user profiles after OAuth login
 * This is particularly useful to ensure all required user data 
 * is correctly populated in the database
 */
export default function useProfileSync() {
  const { data: session, status } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    error: null,
    lastSynced: null
  });

  // Sync the profile when the session is available
  useEffect(() => {
    // Only sync if the user is authenticated
    if (status === "authenticated" && session?.user) {
      // Check if user has a username - if not, we need to sync
      const needsSync = !(session.user as any)?.username;

      if (needsSync) {
        syncProfile();
      }
    }
  }, [session, status]);

  // Function to manually trigger sync
  const syncProfile = async () => {
    if (!session?.user) return;

    try {
      setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));
      
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

      console.log("Profile sync successful");
      
      // Update the sync status
      setSyncStatus({
        syncing: false,
        error: null,
        lastSynced: new Date()
      });

      return data.user;
    } catch (error) {
      console.error("Error syncing profile:", error);
      setSyncStatus({
        syncing: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        lastSynced: null
      });
    }
  };

  return {
    ...syncStatus,
    syncProfile
  };
} 