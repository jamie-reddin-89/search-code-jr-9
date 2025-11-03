import { useState, useEffect } from "react";

interface ErrorCode {
  code: string;
  meaning: string;
  solution: string;
}

export function useErrorCodes(routeName: string) {
  const [errorCodes, setErrorCodes] = useState<Record<string, ErrorCode>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadErrorCodes() {
      if (!routeName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await import(`../data/error-codes/${routeName}.json`);
        
        if (mounted) {
          setErrorCodes(response.default || {});
          setError(null);
        }
      } catch (err) {
        console.error("Error loading error codes:", err);
        if (mounted) {
          setError("Failed to load error codes");
          setErrorCodes({});
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
  }, [routeName]);

  return { errorCodes, loading, error };
}
