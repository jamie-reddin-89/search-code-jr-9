import { useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, FilePlus2, Save } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";

interface ErrorInfo {
  id: string;
  brand?: string;
  model?: string;
  category?: string;
  error_code?: string;
  meaning?: string;
  solution?: string;
}

function readInfos(): ErrorInfo[] { try { const r = localStorage.getItem("jr_error_metadata"); return r? JSON.parse(r): []; } catch { return []; } }
function writeInfos(s: ErrorInfo[]) { localStorage.setItem("jr_error_metadata", JSON.stringify(s)); }

export default function AdminAddErrorInfo() {
  const [list, setList] = useState<ErrorInfo[]>(readInfos());
  const [form, setForm] = useState<ErrorInfo>({ id: crypto.randomUUID() });

  const save = () => {
    const next = [...list, form];
    setList(next);
    writeInfos(next);
    setForm({ id: crypto.randomUUID() });
    alert("Saved");
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
        <h1 className="text-2xl font-bold flex items-center gap-2"><FilePlus2 size={20}/> Add Error Info</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl grid gap-4">
        <div className="border rounded p-3 space-y-2">
          <h2 className="font-semibold">New Error Info</h2>
          <input className="home-button w-full" placeholder="Brand" value={form.brand||""} onChange={e=>setForm({...form, brand:e.target.value})} />
          <input className="home-button w-full" placeholder="Model" value={form.model||""} onChange={e=>setForm({...form, model:e.target.value})} />
          <input className="home-button w-full" placeholder="Category" value={form.category||""} onChange={e=>setForm({...form, category:e.target.value})} />
          <input className="home-button w-full" placeholder="Error Code" value={form.error_code||""} onChange={e=>setForm({...form, error_code:e.target.value})} />
          <textarea className="w-full h-24 p-3 border rounded" placeholder="Meaning" value={form.meaning||""} onChange={e=>setForm({...form, meaning:e.target.value})} />
          <textarea className="w-full h-24 p-3 border rounded" placeholder="Solution" value={form.solution||""} onChange={e=>setForm({...form, solution:e.target.value})} />
          <button className="home-button" onClick={save} aria-label="Save error info"><Save className="inline mr-2"/>Save</button>
        </div>
        <div className="border rounded p-3 space-y-2">
          <h2 className="font-semibold">Latest Entries</h2>
          {list.slice(-5).reverse().map(i => (
            <div key={i.id} className="border rounded p-2 text-sm">
              <div className="font-semibold">{[i.brand, i.model, i.error_code].filter(Boolean).join(" • ")}</div>
              <div className="text-muted-foreground">{i.meaning?.slice(0,120)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
