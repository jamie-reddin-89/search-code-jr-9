import * as React from "react";
const { useEffect, useState } = React;
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const OFFLINE_DATA_KEY = "offline_error_codes";
const LAST_SYNC_KEY = "last_sync_timestamp";

export const useOfflineMode = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(
    localStorage.getItem("offlineMode") === "true"
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const syncTimestamp = localStorage.getItem(LAST_SYNC_KEY);
    if (syncTimestamp) {
      setLastSync(new Date(parseInt(syncTimestamp)));
    }

    const handleDownloadRequest = () => {
      downloadOfflineData();
    };

    window.addEventListener("downloadOfflineData", handleDownloadRequest);
    return () => {
      window.removeEventListener("downloadOfflineData", handleDownloadRequest);
    };
  }, []);

  const downloadOfflineData = async () => {
    try {
      toast({
        title: "Downloading data",
        description: "Downloading error codes for offline use...",
      });

      const { data, error } = await supabase
        .from("error_codes_db")
        .select("*");

      if (error) throw error;

      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(data));
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
      setLastSync(new Date(now));

      toast({
        title: "Download complete",
        description: `${data?.length || 0} error codes available offline`,
      });
    } catch (error) {
      console.error("Error downloading offline data:", error);
      toast({
        title: "Download failed",
        description: "Could not download offline data",
        variant: "destructive",
      });
    }
  };

  const getOfflineData = () => {
    const data = localStorage.getItem(OFFLINE_DATA_KEY);
    return data ? JSON.parse(data) : [];
  };

  const clearOfflineData = () => {
    localStorage.removeItem(OFFLINE_DATA_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
    setLastSync(null);
    toast({
      title: "Offline data cleared",
      description: "All offline data has been removed",
    });
  };

  return {
    isOfflineMode,
    lastSync,
    downloadOfflineData,
    getOfflineData,
    clearOfflineData,
  };
};
