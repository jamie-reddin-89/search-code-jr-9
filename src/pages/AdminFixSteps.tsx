import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Wrench, Plus, Trash2 } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";

interface FixStep {
  id: string;
  brand?: string;
  model?: string;
  error_code?: string;
  title?: string;
  content?: string;
  tags?: string[];
  mediaUrls?: string[];
}

function readSteps(): FixStep[] { try { const r = localStorage.getItem("jr_fix_steps"); return r? JSON.parse(r): []; } catch { return []; } }
function writeSteps(s: FixStep[]) { localStorage.setItem("jr_fix_steps", JSON.stringify(s)); }

export default function AdminFixSteps() {
  const [steps, setSteps] = useState<FixStep[]>(readSteps());
  const [draft, setDraft] = useState<FixStep>({ id: crypto.randomUUID(), tags: [], mediaUrls: [] });

  const saveDraft = () => {
    const next = [...steps, draft];
    setSteps(next);
    writeSteps(next);
    setDraft({ id: crypto.randomUUID(), tags: [], mediaUrls: [] });
  };

  const remove = (id: string) => {
    const next = steps.filter(s=>s.id!==id);
    setSteps(next);
    writeSteps(next);
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
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench size={20}/> Fix Steps</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl grid gap-4">
        <div className="border rounded p-3 space-y-2">
          <h2 className="font-semibold">New Fix Step</h2>
          <input className="home-button w-full" placeholder="Brand" value={draft.brand||""} onChange={e=>setDraft({...draft, brand:e.target.value})} />
          <input className="home-button w-full" placeholder="Model" value={draft.model||""} onChange={e=>setDraft({...draft, model:e.target.value})} />
          <input className="home-button w-full" placeholder="Error Code" value={draft.error_code||""} onChange={e=>setDraft({...draft, error_code:e.target.value})} />
          <input className="home-button w-full" placeholder="Title" value={draft.title||""} onChange={e=>setDraft({...draft, title:e.target.value})} />
          <textarea className="w-full h-28 p-3 border rounded" placeholder="Step-by-step guide..." value={draft.content||""} onChange={e=>setDraft({...draft, content:e.target.value})} />
          <input className="home-button w-full" placeholder="Tags (comma separated)" value={(draft.tags||[]).join(", ")} onChange={e=>setDraft({...draft, tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} />
          <input className="home-button w-full" placeholder="Media URLs (comma separated)" value={(draft.mediaUrls||[]).join(", ")} onChange={e=>setDraft({...draft, mediaUrls:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} />
          <button className="home-button" onClick={saveDraft} aria-label="Save fix step"><Plus className="inline mr-2"/>Save</button>
        </div>

        <div className="border rounded p-3 space-y-2">
          <h2 className="font-semibold">Existing Steps</h2>
          {steps.length===0 && <div className="text-sm text-muted-foreground">No steps yet.</div>}
          {steps.map(s => (
            <div key={s.id} className="border rounded p-3">
              <div className="font-semibold">{s.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground">{[s.brand, s.model, s.error_code].filter(Boolean).join(" • ")}</div>
              {s.tags && s.tags.length>0 && <div className="text-xs mt-1">Tags: {s.tags.join(", ")}</div>}
              <div className="mt-2 whitespace-pre-wrap text-sm">{s.content}</div>
              {s.mediaUrls && s.mediaUrls.length>0 && (
                <ul className="list-disc ml-5 mt-2 text-sm">
                  {s.mediaUrls.map(u => <li key={u}><a className="text-primary underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>)}
                </ul>
              )}
              <div className="mt-2">
                <button className="home-button" onClick={()=>remove(s.id)} aria-label="Delete fix step"><Trash2 className="inline mr-2"/>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
