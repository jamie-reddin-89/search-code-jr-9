import * as React from "react";
const { useState, useEffect } = React;
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error in checkRole:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
