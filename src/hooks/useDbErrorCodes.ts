import * as React from "react";
const { useState, useEffect } = React;
import { supabase } from "@/integrations/supabase/client";

interface DbErrorCode {
  id: string;
  code: string;
  system_name: string;
  meaning: string;
  solution: string;
  difficulty?: string | null;
  estimated_time?: string | null;
  manual_url?: string | null;
  video_url?: string | null;
  related_codes?: string[] | null;
  troubleshooting_steps?: any;
}

export function useDbErrorCodes(systemName: string) {
  const [errorCodes, setErrorCodes] = useState<DbErrorCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadErrorCodes() {
      if (!systemName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await (supabase as any)
          .from("error_codes_db" as any)
          .select("*")
          .eq("system_name", systemName)
          .order("code", { ascending: true });

        if (dbError) throw dbError;

        if (mounted) {
          setErrorCodes(data || []);
          setError(null);
        }
      } catch (err: any) {
        console.error("Error loading error codes:", err);
        if (mounted) {
          setError(err.message || "Failed to load error codes");
          setErrorCodes([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadErrorCodes();

    return () => {
      mounted = false;
    };
  }, [systemName]);

  return { errorCodes, loading, error };
}
