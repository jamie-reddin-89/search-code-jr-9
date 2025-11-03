import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, ScrollText, FileDown, Copy } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { AppLogLevel, exportLogs, getLogs } from "@/lib/tracking";

const LEVELS: AppLogLevel[] = ["Critical", "Urgent", "Shutdown", "Error", "Info"];

export default function AdminAppLogs() {
  const [level, setLevel] = useState<AppLogLevel | "All">("All");

  const logs = useMemo(() => getLogs(level === "All" ? undefined : level), [level]);
  const allLogsText = useMemo(() => exportLogs(), []);
  const filteredText = useMemo(() => logs.map(l => `[${new Date(l.ts).toISOString()}] [${l.level}] ${l.message}`).join("\n"), [logs]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
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
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText size={20}/> App Logs</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">Log importance</label>
          <select className="home-button" value={level} onChange={e=>setLevel(e.target.value as any)}>
            <option>All</option>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Filtered Logs</h2>
            <div className="flex gap-2">
              <button className="home-button" onClick={()=>copy(filteredText)} aria-label="Copy filtered logs"><Copy className="inline mr-2"/>Copy</button>
              <button className="home-button" onClick={()=>download(filteredText, `logs_filtered_${Date.now()}.txt`)} aria-label="Download filtered logs"><FileDown className="inline mr-2"/>Export</button>
            </div>
          </div>
          <textarea className="w-full h-56 p-3 border rounded" readOnly value={filteredText} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">All Logs</h2>
            <div className="flex gap-2">
              <button className="home-button" onClick={()=>copy(allLogsText)} aria-label="Copy all logs"><Copy className="inline mr-2"/>Copy</button>
              <button className="home-button" onClick={()=>download(allLogsText, `logs_all_${Date.now()}.txt`)} aria-label="Download all logs"><FileDown className="inline mr-2"/>Export</button>
            </div>
          </div>
          <textarea className="w-full h-56 p-3 border rounded" readOnly value={allLogsText} />
        </div>
      </div>
    </div>
  );
}
