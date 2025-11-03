import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Favorite {
  system_name: string;
  error_code: string;
}

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadFavorites();
  }, [userId]);

  const loadFavorites = async () => {
    if (!userId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("system_name, error_code")
        .eq("user_id", userId);

      if (error) throw error;

      const favSet = new Set(
        (data as Favorite[]).map((fav) => `${fav.system_name}:${fav.error_code}`)
      );
      setFavorites(favSet);
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (systemName: string, errorCode: string) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    const key = `${systemName}:${errorCode}`;
    const isFavorite = favorites.has(key);

    try {
      if (isFavorite) {
        const { error } = await (supabase as any)
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("system_name", systemName)
          .eq("error_code", errorCode);

        if (error) throw error;

        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });

        toast({
          title: "Removed from favorites",
        });
      } else {
        const { error } = await (supabase as any).from("favorites").insert({
          user_id: userId,
          system_name: systemName,
          error_code: errorCode,
        });

        if (error) throw error;

        setFavorites((prev) => new Set(prev).add(key));

        toast({
          title: "Added to favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    }
  };

  const isFavorite = (systemName: string, errorCode: string) => {
    return favorites.has(`${systemName}:${errorCode}`);
  };

  return { favorites, loading, toggleFavorite, isFavorite };
}