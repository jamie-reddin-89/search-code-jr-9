import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Code2, Plus, Trash2, Edit2 } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { auth } from "@/services/supabase/auth";
import { database } from "@/services/supabase/database";

interface ErrorCode {
  id: string;
  code: string;
  system_name: string;
  meaning: string;
  solution: string;
  difficulty?: string;
  estimated_time?: string;
  manual_url?: string;
  video_url?: string;
  related_codes?: string[];
  troubleshooting_steps?: any;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export default function AdminAddErrorCode() {
  const [errorCodes, setErrorCodes] = useState<ErrorCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ErrorCode>({
    id: crypto.randomUUID(),
    code: "",
    system_name: "",
    meaning: "",
    solution: "",
    difficulty: "medium",
    estimated_time: "",
    manual_url: "",
    video_url: "",
    related_codes: [],
    troubleshooting_steps: null,
  });

  useEffect(() => {
    loadErrorCodes();
  }, []);

  const loadErrorCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await database
        .from("error_codes_db")
        .select("*")
        .order("system_name", { ascending: true })
        .then(result => ({
          ...result,
          data: result.data?.map(item => ({
            ...item,
            id: item.id || crypto.randomUUID(),
          })) || [],
        }));

      if (error) throw error;
      setErrorCodes(data || []);
    } catch (error) {
      console.error("Error loading error codes:", error);
      alert("Failed to load error codes");
    } finally {
      setLoading(false);
    }
  };

  const saveErrorCode = async () => {
    if (!form.code || !form.system_name || !form.meaning || !form.solution) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const user = await auth.getCurrentUser();
      const payload = {
        code: form.code.toUpperCase(),
        system_name: form.system_name,
        meaning: form.meaning,
        solution: form.solution,
        difficulty: form.difficulty || null,
        estimated_time: form.estimated_time || null,
        manual_url: form.manual_url || null,
        video_url: form.video_url || null,
        related_codes: form.related_codes && form.related_codes.length > 0 ? form.related_codes : null,
        troubleshooting_steps: form.troubleshooting_steps || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await database
          .from("error_codes_db")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setErrorCodes(
          errorCodes.map(ec => (ec.id === editingId ? { ...ec, ...payload } : ec))
        );
        setEditingId(null);
      } else {
        const { error } = await database
          .from("error_codes_db")
          .insert([{ id: form.id, ...payload }]);

        if (error) throw error;

        setErrorCodes([...errorCodes, { id: form.id, ...payload } as ErrorCode]);
      }

      setForm({
        id: crypto.randomUUID(),
        code: "",
        system_name: "",
        meaning: "",
        solution: "",
        difficulty: "medium",
        estimated_time: "",
        manual_url: "",
        video_url: "",
        related_codes: [],
        troubleshooting_steps: null,
      });
    } catch (error) {
      console.error("Error saving error code:", error);
      alert("Failed to save error code");
    }
  };

  const deleteErrorCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this error code?")) return;

    try {
      const { error } = await database
        .from("error_codes_db")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setErrorCodes(errorCodes.filter(ec => ec.id !== id));
    } catch (error) {
      console.error("Error deleting error code:", error);
      alert("Failed to delete error code");
    }
  };

  const startEdit = (errorCode: ErrorCode) => {
    setEditingId(errorCode.id);
    setForm(errorCode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      id: crypto.randomUUID(),
      code: "",
      system_name: "",
      meaning: "",
      solution: "",
      difficulty: "medium",
      estimated_time: "",
      manual_url: "",
      video_url: "",
      related_codes: [],
      troubleshooting_steps: null,
    });
  };

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-3xl">
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code2 size={20} /> Add Error Code
        </h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-3xl grid gap-4">
        <div className="border rounded p-4 space-y-3 dark:bg-slate-900">
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit Error Code" : "New Error Code"}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Error Code *</label>
              <input
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
                placeholder="E.g., E01, F02"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">System Name *</label>
              <input
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
                placeholder="Heat Pump Model"
                value={form.system_name}
                onChange={(e) => setForm({ ...form, system_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Meaning *</label>
            <textarea
              className="w-full h-24 p-3 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="What does this error code mean?"
              value={form.meaning}
              onChange={(e) => setForm({ ...form, meaning: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Solution *</label>
            <textarea
              className="w-full h-24 p-3 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="How to fix this error..."
              value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Difficulty</label>
              <select
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
                value={form.difficulty || "medium"}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Estimated Time</label>
              <input
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
                placeholder="E.g., 30 minutes"
                value={form.estimated_time || ""}
                onChange={(e) => setForm({ ...form, estimated_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Manual URL</label>
            <input
              className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="https://example.com/manual"
              value={form.manual_url || ""}
              onChange={(e) => setForm({ ...form, manual_url: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Video URL</label>
            <input
              className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="https://youtube.com/watch?v=..."
              value={form.video_url || ""}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Related Codes (comma separated)</label>
            <input
              className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="E02, E03, F01"
              value={(form.related_codes || []).join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  related_codes: e.target.value
                    .split(",")
                    .map((c) => c.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="flex gap-2">
            <button
              className="home-button flex-1"
              onClick={saveErrorCode}
              aria-label={editingId ? "Update error code" : "Save error code"}
              disabled={loading}
            >
              <Plus className="inline mr-2" size={16} />
              {editingId ? "Update Error Code" : "Save Error Code"}
            </button>
            {editingId && (
              <button
                className="home-button"
                onClick={cancelEdit}
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="border rounded p-4 dark:bg-slate-900">
          <h2 className="font-semibold text-lg mb-4">Error Codes ({errorCodes.length})</h2>
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!loading && errorCodes.length === 0 && (
            <div className="text-sm text-muted-foreground">No error codes yet.</div>
          )}
          <div className="space-y-3">
            {errorCodes.map((ec) => (
              <div key={ec.id} className="border rounded p-3 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {ec.code} - {ec.system_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{ec.meaning}</div>
                    <div className="mt-2 text-sm text-foreground">{ec.solution}</div>
                    {ec.difficulty && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Difficulty: {ec.difficulty} | Time: {ec.estimated_time || "N/A"}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      className="home-button p-2"
                      onClick={() => startEdit(ec)}
                      aria-label="Edit error code"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="home-button p-2"
                      onClick={() => deleteErrorCode(ec.id)}
                      aria-label="Delete error code"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
