import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, FilePlus2, Save, Trash2 } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { database } from "@/services/supabase/database";

interface ErrorInfo {
  id: string;
  brand_id?: string;
  model_id?: string;
  category_id?: string;
  error_code?: string;
  meaning?: string;
  solution?: string;
  created_at?: string;
  updated_at?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  brand_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminAddErrorInfo() {
  const [list, setList] = useState<ErrorInfo[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ErrorInfo>({ id: crypto.randomUUID() });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (form.brand_id) {
      const filtered = models.filter(m => m.brand_id === form.brand_id);
      setFilteredModels(filtered);
      if (!form.model_id || !filtered.find(m => m.id === form.model_id)) {
        setForm({ ...form, model_id: "" });
      }
    } else {
      setFilteredModels([]);
    }
  }, [form.brand_id, models]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listResult, brandsResult, modelsResult, categoriesResult] = await Promise.all([
        database
          .from("error_info")
          .select("*")
          .order("created_at", { ascending: false }),
        database.from("brands").select("*").order("name"),
        database.from("models").select("*").order("name"),
        database.from("categories").select("*").order("name"),
      ]);

      if (listResult.data) setList(listResult.data);
      if (brandsResult.data) setBrands(brandsResult.data);
      if (modelsResult.data) setModels(modelsResult.data);
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.brand_id || !form.model_id || !form.category_id || !form.error_code || !form.meaning || !form.solution) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const newInfo = {
        id: form.id,
        brand_id: form.brand_id,
        model_id: form.model_id,
        category_id: form.category_id,
        error_code: form.error_code.toUpperCase(),
        meaning: form.meaning,
        solution: form.solution,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await database
        .from("error_info")
        .insert([newInfo]);

      if (error) throw error;

      setList([newInfo, ...list]);
      setForm({ id: crypto.randomUUID() });
    } catch (error) {
      console.error("Error saving error info:", error);
      alert("Failed to save error info");
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await database
        .from("error_info")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setList(list.filter(i => i.id !== id));
    } catch (error) {
      console.error("Error deleting error info:", error);
      alert("Failed to delete error info");
    }
  };

  const getBrandName = (brandId?: string) => {
    if (!brandId) return "";
    return brands.find(b => b.id === brandId)?.name || "";
  };

  const getModelName = (modelId?: string) => {
    if (!modelId) return "";
    return models.find(m => m.id === modelId)?.name || "";
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "";
    return categories.find(c => c.id === categoryId)?.name || "";
  };

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-2xl">
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

      <div className="w-full max-w-2xl grid gap-4">
        <div className="border rounded p-4 space-y-3 dark:bg-slate-900">
          <h2 className="font-semibold text-lg">New Error Info</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Brand *</label>
              <select
                value={form.brand_id || ""}
                onChange={e => setForm({...form, brand_id: e.target.value})}
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Select Brand...</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Model *</label>
              <select
                value={form.model_id || ""}
                onChange={e => setForm({...form, model_id: e.target.value})}
                disabled={!form.brand_id}
                className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
              >
                <option value="">Select Model...</option>
                {filteredModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Category *</label>
            <select
              value={form.category_id || ""}
              onChange={e => setForm({...form, category_id: e.target.value})}
              className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="">Select Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Error Code *</label>
            <input
              className="w-full px-3 py-2 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="E.g., E01, F02"
              value={form.error_code || ""}
              onChange={e => setForm({...form, error_code: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Meaning *</label>
            <textarea
              className="w-full h-20 p-3 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="What does this error code mean?"
              value={form.meaning || ""}
              onChange={e => setForm({...form, meaning: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Solution *</label>
            <textarea
              className="w-full h-20 p-3 border rounded bg-background text-foreground dark:bg-slate-800 dark:border-slate-700"
              placeholder="How to resolve this error..."
              value={form.solution || ""}
              onChange={e => setForm({...form, solution: e.target.value})}
            />
          </div>

          <button
            className="home-button w-full"
            onClick={save}
            aria-label="Save error info"
            disabled={loading}
          >
            <Save className="inline mr-2" size={16} /> Save Error Info
          </button>
        </div>

        <div className="border rounded p-4 dark:bg-slate-900">
          <h2 className="font-semibold text-lg mb-4">Latest Error Info ({list.length})</h2>
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!loading && list.length === 0 && <div className="text-sm text-muted-foreground">No error info yet.</div>}
          <div className="space-y-2">
            {list.slice(0, 10).map(i => (
              <div key={i.id} className="border rounded p-3 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {i.error_code} - {getBrandName(i.brand_id)} {getModelName(i.model_id)}
                    </div>
                    <div className="text-xs text-muted-foreground">{getCategoryName(i.category_id)}</div>
                    <div className="text-sm text-foreground mt-1">{i.meaning}</div>
                    <div className="text-xs text-muted-foreground mt-1">{i.solution?.slice(0, 120)}...</div>
                  </div>
                  <button
                    className="home-button p-2 ml-2"
                    onClick={() => remove(i.id)}
                    aria-label="Delete error info"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
