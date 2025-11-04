import { useEffect, useState } from "react";
import { auth } from "@/services/supabase/auth";
import { trackUserActivity, createUserSession } from "@/lib/userTracking";

let sessionId: string | null = null;

export function useUserActivity() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Create a new session for this user
        const session = await createUserSession(user.id);
        if (session) {
          sessionId = session.id;
        }
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    // Track page views
    trackUserActivity(currentUser?.id || null, "page_view");

    // Cleanup on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const trackActivity = async (type: string, path?: string, meta?: any) => {
    await trackUserActivity(currentUser?.id || null, type, path, meta);
  };

  return { currentUser, trackActivity };
}
