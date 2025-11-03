import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

export const useAnalytics = () => {
  const trackSearch = async (systemName: string, errorCode: string, userId?: string) => {
    try {
      await (supabase as any).from("search_analytics" as any).insert({
        system_name: systemName,
        error_code: errorCode,
        user_id: userId || null,
      });
    } catch (error) {
      // ignore if backend not available
    } finally {
      await trackEvent("search", { systemName, errorCode }, undefined, userId);
    }
  };

  return { trackSearch };
};
