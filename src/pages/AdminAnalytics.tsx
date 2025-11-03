import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, BarChart3, RefreshCw } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import {
  getAnalytics,
  getAnalyticsSummary,
  getMostSearchedErrorCodes,
  getMostViewedPages,
} from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsEvent {
  id: string;
  user_id?: string;
  device_id?: string;
  event_type: string;
  path?: string;
  meta?: Record<string, any>;
  timestamp: string;
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="text-xs font-medium w-40 truncate">{d.label}</div>
          <div className="flex-1 bg-secondary rounded overflow-hidden h-6">
            <div
              className="bg-primary h-full flex items-center justify-end px-2"
              style={{ width: `${(d.value / max) * 100}%` }}
            >
              <span className="text-xs text-primary-foreground font-bold">
                {d.value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const allEvents = await getAnalytics(fromDate, toDate);
      setEvents(allEvents);
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast({
        title: "Error loading analytics",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const { summary, clicks, pageViews, searchedCodes } = useMemo(() => {
    const eventTypeCounts: Record<string, number> = {};
    const clicksByLabel: Record<string, number> = {};
    const pageViewsByPath: Record<string, number> = {};
    const codesByName: Record<string, { code: string; system: string; count: number }> =
      {};

    for (const event of events) {
      // Count by event type
      eventTypeCounts[event.event_type] =
        (eventTypeCounts[event.event_type] || 0) + 1;

      // Count button clicks
      if (event.event_type === "button_click") {
        const label = event.meta?.buttonLabel || "unknown";
        clicksByLabel[label] = (clicksByLabel[label] || 0) + 1;
      }

      // Count page views
      if (event.event_type === "page_view") {
        const path = event.path || "/";
        pageViewsByPath[path] = (pageViewsByPath[path] || 0) + 1;
      }

      // Count error code searches
      if (event.event_type === "error_code_search") {
        const code = event.meta?.errorCode || "unknown";
        const system = event.meta?.systemName || "unknown";
        const key = `${code}:${system}`;
        codesByName[key] = {
          code,
          system,
          count: (codesByName[key]?.count || 0) + 1,
        };
      }
    }

    const clickData = Object.entries(clicksByLabel)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const pageData = Object.entries(pageViewsByPath)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const codeData = Object.values(codesByName)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      summary: eventTypeCounts,
      clicks: clickData,
      pageViews: pageData,
      searchedCodes: codeData,
    };
  }, [events]);

  const kpis = useMemo(() => {
    const totalEvents = events.length;
    const totalSearches = events.filter((e) => e.event_type === "error_code_search")
      .length;
    const totalClicks = events.filter((e) => e.event_type === "button_click").length;
    const totalPageViews = events.filter((e) => e.event_type === "page_view").length;
    const uniqueUsers = new Set(events.map((e) => e.user_id).filter(Boolean)).size;
    const uniqueDevices = new Set(events.map((e) => e.device_id).filter(Boolean))
      .size;

    return {
      totalEvents,
      totalSearches,
      totalClicks,
      totalPageViews,
      uniqueUsers,
      uniqueDevices,
    };
  }, [events]);

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-xl">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Back to Admin">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Go Home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={20} /> Analytics
        </h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl space-y-6">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">From Date</label>
            <input
              type="date"
              className="w-full px-2 py-1 border rounded text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">To Date</label>
            <input
              type="date"
              className="w-full px-2 py-1 border rounded text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Load
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold">{kpis.totalEvents}</div>
          </div>
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Page Views</div>
            <div className="text-2xl font-bold">{kpis.totalPageViews}</div>
          </div>
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Searches</div>
            <div className="text-2xl font-bold">{kpis.totalSearches}</div>
          </div>
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Clicks</div>
            <div className="text-2xl font-bold">{kpis.totalClicks}</div>
          </div>
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Unique Users</div>
            <div className="text-2xl font-bold">{kpis.uniqueUsers}</div>
          </div>
          <div className="p-3 border rounded text-center">
            <div className="text-xs text-muted-foreground">Devices</div>
            <div className="text-2xl font-bold">{kpis.uniqueDevices}</div>
          </div>
        </div>

        {clicks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Top Clicked Elements</h2>
            <BarChart data={clicks} />
          </div>
        )}

        {pageViews.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Top Pages</h2>
            <BarChart data={pageViews} />
          </div>
        )}

        {searchedCodes.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Most Searched Error Codes</h2>
            <div className="space-y-2">
              {searchedCodes.map((item, i) => (
                <div
                  key={i}
                  className="p-2 border rounded flex justify-between items-center text-sm"
                >
                  <div>
                    <span className="font-mono font-semibold">{item.code}</span>
                    <span className="text-muted-foreground ml-2">
                      ({item.system})
                    </span>
                  </div>
                  <span className="bg-primary/10 px-2 py-1 rounded">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No analytics data available for the selected date range
          </div>
        )}
      </div>
    </div>
  );
}
