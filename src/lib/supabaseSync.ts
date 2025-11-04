import { supabase } from "@/integrations/supabase/client";
import { getEvents, getLogs } from "@/lib/tracking";

const LS_EVENTS = "jr_user_events";
const LS_FIX_STEPS = "jr_fix_steps";
const LS_ERROR_META = "jr_error_metadata";

function readLS<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw? JSON.parse(raw): []; } catch { return []; } }
function writeLS<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

export async function syncEvents() {
  const events = readLS<any>(LS_EVENTS);
  if (!events.length) return;
  try {
    const payload = events.map(e => ({
      id: e.id,
      user_id: e.userId || null,
      device_id: e.deviceId,
      event_type: e.type,
      path: e.path,
      timestamp: new Date(e.ts).toISOString(),
      meta: {
        geo_lat: e.geo?.lat ?? null,
        geo_lon: e.geo?.lon ?? null,
        ...e.meta
      } || null,
    }));
    await retryWithBackoff(() => (supabase as any).from("app_analytics" as any).insert(payload), 3, 500);
    writeLS(LS_EVENTS, []);
  } catch (err) {
    // keep in queue on failure - silently fail to prevent app crash
    console.debug("Event sync failed (non-critical):", err);
  }
}

export async function syncLogs() {
  const logs = getLogs();
  if (!logs.length) return;
  try {
    const payload = logs.map(l => ({
      id: l.id,
      level: l.level,
      message: l.message,
      stack_trace: l.stack ? { stack: l.stack } : null,
      meta: l.meta || null,
      timestamp: new Date(l.ts).toISOString(),
    }));
    await retryWithBackoff(() => (supabase as any).from("app_logs" as any).insert(payload), 3, 500);
    // clear after successful insert
    localStorage.setItem("jr_app_logs", JSON.stringify([]));
  } catch (err) {
    // keep local - silently fail to prevent app crash
    console.debug("Log sync failed (non-critical):", err);
  }
}

export async function syncFixSteps() {
  const steps = readLS<any>(LS_FIX_STEPS);
  if (!steps.length) return;
  try {
    await (supabase as any).from("fix_steps" as any).upsert(steps.map((s: any) => ({
      id: s.id,
      brand: s.brand || null,
      model: s.model || null,
      error_code: s.error_code || null,
      title: s.title || null,
      content: s.content || null,
      tags: s.tags || [],
      media_urls: s.mediaUrls || [],
    })));
    writeLS(LS_FIX_STEPS, []);
  } catch (err) {
    // keep in queue on failure - silently fail to prevent app crash
    console.debug("Fix steps sync failed (non-critical):", err);
  }
}

export async function syncErrorInfo() {
  const infos = readLS<any>(LS_ERROR_META);
  if (!infos.length) return;
  try {
    await (supabase as any).from("error_metadata" as any).upsert(infos.map((i:any)=>({
      id: i.id,
      brand: i.brand||null,
      model: i.model||null,
      category: i.category||null,
      error_code: i.error_code||null,
      meaning: i.meaning||null,
      solution: i.solution||null,
    })));
    writeLS(LS_ERROR_META, []);
  } catch (err) {
    // keep in queue on failure - silently fail to prevent app crash
    console.debug("Error metadata sync failed (non-critical):", err);
  }
}

export async function syncAll() {
  await syncEvents();
  await syncLogs();
  await syncFixSteps();
  await syncErrorInfo();
}
