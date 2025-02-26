"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { PropsWithChildren, useEffect, useState } from "react";

// Simple wrapper for SessionProvider
export function AuthProvider({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <ProfileSyncOnLogin>
        {children}
      </ProfileSyncOnLogin>
    </SessionProvider>
  );
}

// New component that only syncs once after login
function ProfileSyncOnLogin({ children }: PropsWithChildren) {
  const { data: session, status, update: updateSession } = useSession();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only sync if:
    // 1. User is authenticated
    // 2. We haven't already synced in this session
    // 3. Session has loaded and contains user data
    if (
      status === "authenticated" && 
      !hasSynced && 
      session?.user?.id
    ) {
      const syncProfile = async () => {
        try {
          console.log("One-time profile sync after login...");
          
          // Skip if user already has a username
          if ((session.user as any)?.username) {
            console.log("User already has username, skipping sync");
            setHasSynced(true);
            return;
          }
          
          // Try to get user data
          const response = await fetch("/api/auth/sync-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
  
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Update session with the synced data
              await updateSession({
                ...session,
                user: {
                  ...session.user,
                  ...data.user
                }
              });
              console.log("Session updated after login sync");
            }
          }
        } catch (error) {
          console.error("Error in one-time profile sync:", error);
        } finally {
          // Mark as synced even if there was an error to prevent infinite retries
          setHasSynced(true);
        }
      };
      
      // Sync with a small delay to ensure everything is loaded
      const timer = setTimeout(syncProfile, 500);
      return () => clearTimeout(timer);
    }
  }, [session, status, hasSynced, updateSession]);

  // Just render children, no UI impact
  return <>{children}</>;
} 