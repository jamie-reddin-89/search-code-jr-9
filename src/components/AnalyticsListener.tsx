import { useEffect } from "react";
import { trackEvent, log } from "@/lib/tracking";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AnalyticsListener() {
  const location = useLocation();

  useEffect(() => {
    const trackPV = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await trackEvent("page_view", undefined, location.pathname + location.hash, session?.user?.id || null);
      } catch (error) {
        // Silently fail - analytics is non-critical
        console.debug("Analytics tracking failed (non-critical):", error);
      }
    };
    trackPV();
  }, [location]);

  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement;
        const btn = target.closest(".nav-button, button, a") as HTMLElement | null;
        if (btn) {
          const label = (btn.getAttribute("aria-label") || btn.textContent || "").trim().slice(0, 100);
          await trackEvent("element_click", { label });
        }
      } catch (error) {
        // Silently fail - analytics is non-critical
        console.debug("Click tracking failed (non-critical):", error);
      }
    };
    document.addEventListener("click", onClick);
    const onError = (event: ErrorEvent) => {
      try {
        log("Error", event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno });
      } catch (error) {
        // Silently fail - logging is non-critical
        console.debug("Error logging failed (non-critical):", error);
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      try {
        log("Error", String(event.reason));
      } catch (error) {
        // Silently fail - logging is non-critical
        console.debug("Error logging failed (non-critical):", error);
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
