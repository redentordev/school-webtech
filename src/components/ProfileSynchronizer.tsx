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
  const { data: session } = useSession();
  const { syncing, error, syncProfile } = useProfileSync();
  
  // Re-attempt sync if there was an error
  useEffect(() => {
    if (error && session) {
      // Wait a bit before retrying
      const timer = setTimeout(() => {
        console.log("Retrying profile sync after error...");
        syncProfile();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, session, syncProfile]);

  // This component doesn't render anything
  return null;
} 