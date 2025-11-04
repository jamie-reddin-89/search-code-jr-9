import { useState, useEffect } from "react";
import { auth } from "@/services/supabase/auth";
import { database } from "@/services/supabase/database";

export function useUserRole() {
  const [role, setRole] = useState<"admin" | "moderator" | "user">("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const user = await auth.getCurrentUser();
        if (!user) {
          setRole("user");
          setLoading(false);
          return;
        }

        const { data, error } = await database
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error checking role:", error);
          setRole("user");
        } else {
          const r = (data?.role as any) || "user";
          setRole(r === "admin" || r === "moderator" ? r : "user");
        }
      } catch (error) {
        console.error("Error in checkRole:", error);
        setRole("user");
      } finally {
        setLoading(false);
      }
    }

    checkRole();

    const { data: { subscription } } = auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  return { role, isAdmin, isModerator, loading };
}
