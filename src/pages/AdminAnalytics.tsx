import * as React from "react";
const { useMemo, useState } = React;
import { Link } from "react-router-dom";
import { Home, ArrowLeft, BarChart3 } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { getEvents } from "@/lib/tracking";

function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K) {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc as any)[k] = ((acc as any)[k] || 0) + 1;
    return acc;
  }, {} as Record<K, number>);
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <svg viewBox={`0 0 100 ${data.length * 12}`} className="w-full border rounded">
      {data.map((d, i) => (
        <g key={i} transform={`translate(0, ${i * 12})`}>
          <rect x={0} y={2} width={(d.value / max) * 90} height={8} fill="hsl(var(--primary))" />
          <text x={0} y={10} fontSize={3} fill="hsl(var(--foreground))">{d.label.slice(0, 20)}</text>
          <text x={92} y={10} fontSize={3} fill="hsl(var(--foreground))">{d.value}</text>
        </g>
      ))}
    </svg>
  );
}

export default function AdminAnalytics() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { clicks, pvs, kpis } = useMemo(() => {
    const events = getEvents();
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 24*3600*1000 : Infinity;
    const filtered = events.filter(e => e.ts >= fromTs && e.ts <= toTs);
    const clickEvents = filtered.filter(e => e.type === "element_click");
    const pvEvents = filtered.filter(e => e.type === "page_view");

    const clickCounts = groupBy(clickEvents, e => (e.meta?.label || "unknown") as string);
    const pvCounts = groupBy(pvEvents, e => e.path);

    const clicks = Object.entries(clickCounts).map(([label, value]) => ({ label, value: value as number }))
      .sort((a,b)=>b.value-a.value);
    const pvs = Object.entries(pvCounts).map(([label, value]) => ({ label, value: value as number }))
      .sort((a,b)=>b.value-a.value);

    // Uptime approximations by device
    const byDevice = new Map<string, { first: number; last: number }>();
    for (const e of filtered) {
      const d = byDevice.get(e.deviceId) || { first: e.ts, last: e.ts };
      d.first = Math.min(d.first, e.ts);
      d.last = Math.max(d.last, e.ts);
      byDevice.set(e.deviceId, d);
    }
    const totalUserTimeMs = Array.from(byDevice.values()).reduce((sum, d) => sum + (d.last - d.first), 0);
    const sinceFirstEvent = filtered.length ? (Date.now() - Math.min(...filtered.map(e=>e.ts))) : 0;

    return {
      clicks,
      pvs,
      kpis: {
        mostPopular: clicks[0]?.label || "-",
        leastPopular: clicks[clicks.length-1]?.label || "-",
        dbUptime: "N/A (client-only)",
        appUptime: Math.round(sinceFirstEvent/3600000) + "h",
        totalUserTime: Math.round(totalUserTimeMs/3600000) + "h",
      }
    };
  }, [from, to]);

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-xl">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <button className="home-button" aria-label="Back to Admin">
              <ArrowLeft className="inline mr-2" /> Back
            </button>
          </Link>
          <Link to="/">
            <button className="home-button" aria-label="Go Home">
              <Home className="inline mr-2" /> Home
            </button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={20}/> Analytics</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl space-y-6">
        <div className="flex gap-2">
          <input type="date" className="home-button" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" className="home-button" value={to} onChange={e=>setTo(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 border rounded"><div className="text-sm text-muted-foreground">Most Popular</div><div className="text-xl font-bold">{kpis.mostPopular}</div></div>
          <div className="p-4 border rounded"><div className="text-sm text-muted-foreground">Least Popular</div><div className="text-xl font-bold">{kpis.leastPopular}</div></div>
          <div className="p-4 border rounded"><div className="text-sm text-muted-foreground">DB Uptime</div><div className="text-xl font-bold">{kpis.dbUptime}</div></div>
          <div className="p-4 border rounded md:col-span-3"><div className="text-sm text-muted-foreground">Webapp Uptime Since First Event</div><div className="text-xl font-bold">{kpis.appUptime}</div></div>
          <div className="p-4 border rounded md:col-span-3"><div className="text-sm text-muted-foreground">Overall Total User Time</div><div className="text-xl font-bold">{kpis.totalUserTime}</div></div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Top Clicked Elements</h2>
          <BarChart data={clicks.slice(0,10)} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Page Views</h2>
          <BarChart data={pvs.slice(0,10)} />
        </div>
      </div>
    </div>
  );
}
