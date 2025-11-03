type EventType = "page_view" | "element_click" | "search" | "performance" | "custom";

export type AppLogLevel = "Critical" | "Urgent" | "Shutdown" | "Error" | "Info";

interface BaseEvent {
  id: string;
  type: EventType;
  path: string;
  ts: number;
  deviceId: string;
  userId?: string | null;
  meta?: Record<string, any>;
  geo?: { lat: number; lon: number } | null;
}

const LS_KEYS = {
  deviceId: "jr_device_id",
  events: "jr_user_events",
  logs: "jr_app_logs",
  geo: "jr_geo_last",
} as const;

export function getDeviceId() {
  let id = localStorage.getItem(LS_KEYS.deviceId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_KEYS.deviceId, id);
  }
  return id;
}

export async function getGeolocationCached(): Promise<{ lat: number; lon: number } | null> {
  try {
    const cached = localStorage.getItem(LS_KEYS.geo);
    if (cached) return JSON.parse(cached);
    if (!("geolocation" in navigator)) return null;
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
    );
    const geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    localStorage.setItem(LS_KEYS.geo, JSON.stringify(geo));
    return geo;
  } catch {
    return null;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, arr: T[]) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export async function trackEvent(type: EventType, meta?: Record<string, any>, path?: string, userId?: string | null) {
  const deviceId = getDeviceId();
  const geo = await getGeolocationCached();
  const evt: BaseEvent = {
    id: crypto.randomUUID(),
    type,
    path: path || location.hash || location.pathname || "/",
    ts: Date.now(),
    deviceId,
    userId: userId || null,
    meta,
    geo,
  };
  const events = readArray<BaseEvent>(LS_KEYS.events);
  events.push(evt);
  writeArray(LS_KEYS.events, events);
}

export function getEvents(filter?: Partial<Pick<BaseEvent, "type">>) {
  const events = readArray<BaseEvent>(LS_KEYS.events);
  if (filter?.type) return events.filter(e => e.type === filter.type);
  return events;
}

export interface AppLogEntry {
  id: string;
  level: AppLogLevel;
  message: string;
  ts: number;
  stack?: string;
  meta?: Record<string, any>;
}

export function log(level: AppLogLevel, message: string, meta?: Record<string, any>) {
  const entry: AppLogEntry = { id: crypto.randomUUID(), level, message, ts: Date.now(), meta };
  const logs = readArray<AppLogEntry>(LS_KEYS.logs);
  logs.push(entry);
  writeArray(LS_KEYS.logs, logs);
}

export function getLogs(level?: AppLogLevel) {
  const logs = readArray<AppLogEntry>(LS_KEYS.logs);
  return level ? logs.filter(l => l.level === level) : logs;
}

export function exportLogs(): string {
  const logs = getLogs();
  return logs.map(l => `[${new Date(l.ts).toISOString()}] [${l.level}] ${l.message}${l.stack ? "\n" + l.stack : ""}`).join("\n");
}

export function clearLogs() {
  writeArray<AppLogEntry>(LS_KEYS.logs, []);
}

export type AgeGroup = "18-24" | "25-34" | "35-54" | "55+" | "unknown";
export type GenderEst = "male" | "female" | "unknown";

export function estimateDemographics(events: any[]): { age: AgeGroup; gender: GenderEst } {
  // Heuristic: use average time between interactions and device hints.
  const clicks = events.filter(e => e.type === "element_click" || e.type === "search").sort((a,b)=>a.ts-b.ts);
  if (clicks.length < 2) return { age: "unknown", gender: "unknown" };
  let sum = 0; for (let i=1;i<clicks.length;i++){ sum += (clicks[i].ts - clicks[i-1].ts); }
  const avg = sum / (clicks.length - 1);
  let age: AgeGroup = "unknown";
  if (avg < 1500) age = "18-24"; else if (avg < 2500) age = "25-34"; else if (avg < 5000) age = "35-54"; else age = "55+";
  const ua = navigator.userAgent.toLowerCase();
  // Very weak, default unknown; small nudge based on platform usage only
  let gender: GenderEst = "unknown";
  if (ua.includes("iphone") || ua.includes("mac os")) gender = "female"; // placeholder heuristic
  if (ua.includes("linux") || ua.includes("windows nt")) gender = gender === "unknown" ? "male" : gender;
  return { age, gender };
}
