import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, ScrollText, FileDown, Copy, RefreshCw, Trash2 } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { getLogs, deleteOldLogs, type LogLevel } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const LEVELS: LogLevel[] = ["Critical", "Urgent", "Shutdown", "Error", "Warning", "Info", "Debug"];

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  stack_trace?: Record<string, any>;
  user_id?: string;
  page_path?: string;
  timestamp: string;
}

export default function AdminAppLogs() {
  const [level, setLevel] = useState<LogLevel | "All">("All");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await getLogs(level === "All" ? undefined : (level as LogLevel));
      setLogs(allLogs);
    } catch (err) {
      console.error("Error loading logs:", err);
      toast({
        title: "Error loading logs",
        description: "Failed to fetch logs from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [level]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const download = (text: string, name: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteOldLogs = async () => {
    if (!confirm("Delete logs older than 30 days?")) return;
    
    setLoading(true);
    try {
      const success = await deleteOldLogs(30);
      if (success) {
        toast({ title: "Old logs deleted successfully" });
        loadLogs();
      } else {
        toast({ title: "Failed to delete old logs", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = level === "All" ? logs : logs.filter(l => l.level === level);

  const filteredText = filteredLogs
    .map(
      (l) =>
        `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}${
          l.stack_trace ? "\n" + JSON.stringify(l.stack_trace, null, 2) : ""
        }`
    )
    .join("\n");

  const allLogsText = logs
    .map(
      (l) =>
        `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}${
          l.stack_trace ? "\n" + JSON.stringify(l.stack_trace, null, 2) : ""
        }`
    )
    .join("\n");

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
          <ScrollText size={20} /> App Logs
        </h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium">Log Level:</label>
          <select
            className="px-3 py-1 border rounded text-sm"
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel | "All")}
          >
            <option>All</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteOldLogs}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Old
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="p-2 border rounded text-center">
            <div className="text-muted-foreground">Total Logs</div>
            <div className="font-bold">{logs.length}</div>
          </div>
          <div className="p-2 border rounded text-center">
            <div className="text-muted-foreground">Errors</div>
            <div className="font-bold">
              {logs.filter((l) => l.level === "Error").length}
            </div>
          </div>
          <div className="p-2 border rounded text-center">
            <div className="text-muted-foreground">Critical</div>
            <div className="font-bold">
              {logs.filter((l) => l.level === "Critical").length}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Filtered Logs ({filteredLogs.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(filteredText)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => download(filteredText, `logs_${Date.now()}.txt`)}
              >
                <FileDown className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          <div className="border rounded p-3 bg-background max-h-64 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs to display</p>
            ) : (
              <pre className="text-xs whitespace-pre-wrap break-words">
                {filteredText}
              </pre>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">All Logs ({logs.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(allLogsText)}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => download(allLogsText, `logs_all_${Date.now()}.txt`)}
              >
                <FileDown className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          <div className="border rounded p-3 bg-background max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs available</p>
            ) : (
              <pre className="text-xs whitespace-pre-wrap break-words">
                {allLogsText}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
