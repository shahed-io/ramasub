import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Layers, Image as ImageIcon, Star, Search as SearchIcon, GripVertical,
  Eye, EyeOff, Plus, Trash2, Save, Loader2, ArrowUp, ArrowDown, Sparkles, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listProducts } from "@/lib/products.functions";
import type { Product } from "@/data/products";
import {
  fetchHomepageConfig, saveHomepageConfig, DEFAULT_CONFIG,
  type HomepageConfig, type SectionId,
} from "@/lib/homepage-config";

export const Route = createFileRoute("/Mahbub214/homepage-editor")({
  component: HomepageEditorPage,
  head: () => ({
    meta: [
      { title: "Homepage Editor — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type BannerSlide = {
  id: string;
  is_active: boolean;
  sort_order: number;
  data: {
    category?: string; title?: string; subtitle?: string;
    cta?: string; link?: string; secondary_cta?: string; secondary_link?: string;
    image_url?: string; color_preset?: string;
  };
};

const COLOR_PRESETS = ["ruby", "sapphire", "emerald", "ocean", "violet", "sunset", "graphite"] as const;
type TabId = "sections" | "banner" | "featured" | "seo";

function HomepageEditorPage() {
  const [tab, setTab] = useState<TabId>("sections");
  const [cfg, setCfg] = useState<HomepageConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await fetchHomepageConfig();
      setCfg(c);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try { await saveHomepageConfig(cfg); toast.success("Homepage config saved"); }
    catch (e: unknown) { toast.error((e as Error)?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" /> Homepage Editor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Banner, section order, featured products, SEO — সব এক জায়গায়।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Reload
          </button>
          {tab !== "banner" && (
            <button
              onClick={save}
              disabled={saving || loading}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-full p-1 shadow-sm w-fit">
        {([
          ["sections", "Sections", Layers],
          ["banner", "Banner Slider", ImageIcon],
          ["featured", "Featured Products", Star],
          ["seo", "SEO", SearchIcon],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`h-9 px-4 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 ${
              tab === id
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <>
          {tab === "sections" && <SectionsTab cfg={cfg} setCfg={setCfg} />}
          {tab === "banner" && <BannerTab />}
          {tab === "featured" && <FeaturedTab cfg={cfg} setCfg={setCfg} />}
          {tab === "seo" && <SeoTab cfg={cfg} setCfg={setCfg} />}
        </>
      )}
    </div>
  );
}

/* ==================== Sections Tab ==================== */
function SectionsTab({ cfg, setCfg }: { cfg: HomepageConfig; setCfg: (c: HomepageConfig) => void }) {
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...cfg.sections];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((s, i) => (s.order = i));
    setCfg({ ...cfg, sections: next });
  };
  const toggle = (id: SectionId) => {
    setCfg({
      ...cfg,
      sections: cfg.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-l-4 border-violet-500">
        <h3 className="text-base font-extrabold text-slate-900">Section Visibility & Order</h3>
        <p className="text-xs text-slate-500 mt-0.5">Arrows দিয়ে reorder করুন, eye icon দিয়ে show/hide করুন। Save Changes চাপুন।</p>
      </div>
      <div className="divide-y divide-slate-100">
        {cfg.sections.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <div className="font-semibold text-slate-800">{s.label}</div>
              <div className="text-[11px] text-slate-500">{s.id} · position {idx + 1}</div>
            </div>
            <button onClick={() => move(idx, -1)} disabled={idx === 0}
              className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-600 disabled:opacity-30 hover:bg-slate-50">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={() => move(idx, 1)} disabled={idx === cfg.sections.length - 1}
              className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-600 disabled:opacity-30 hover:bg-slate-50">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button onClick={() => toggle(s.id)}
              className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border ${
                s.visible
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-slate-100 border-slate-200 text-slate-500"
              }`}>
              {s.visible ? <><Eye className="w-3.5 h-3.5" /> Visible</> : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== Banner Tab ==================== */
function BannerTab() {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_records")
      .select("id, is_active, sort_order, data")
      .eq("kind", "banner_slider")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setSlides(((data ?? []) as unknown) as BannerSlide[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const patch = async (id: string, updates: Partial<BannerSlide>) => {
    setBusyId(id);
    const payload: { is_active?: boolean; sort_order?: number; data?: import("@/integrations/supabase/types").Json } = {};
    if ("is_active" in updates) payload.is_active = updates.is_active;
    if ("sort_order" in updates) payload.sort_order = updates.sort_order;
    if ("data" in updates) payload.data = JSON.parse(JSON.stringify(updates.data));
    const { error } = await supabase.from("admin_records").update(payload).eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("এই slide টা delete করবেন?")) return;
    setBusyId(id);
    const { error } = await supabase.from("admin_records").delete().eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Slide deleted");
    await load();
  };

  const add = async () => {
    const nextOrder = (slides[slides.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("admin_records").insert({
      kind: "banner_slider", is_active: true, sort_order: nextOrder,
      data: { title: "New Slide", subtitle: "", cta: "এখনই কিনুন", link: "/products", color_preset: "sapphire" },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slide added");
    await load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const a = slides[idx], b = slides[j];
    await supabase.from("admin_records").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("admin_records").update({ sort_order: a.sort_order }).eq("id", b.id);
    await load();
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={add} className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-teal-600 text-white text-sm font-bold shadow inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>
      {slides.length === 0 && (
        <div className="p-10 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl">
          এখনো কোনো slide নেই। Add Slide চাপুন।
        </div>
      )}
      {slides.map((s, idx) => (
        <div key={s.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">SLIDE #{idx + 1}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
              {s.is_active ? "ACTIVE" : "HIDDEN"}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-30 hover:bg-slate-50"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-30 hover:bg-slate-50"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => patch(s.id, { is_active: !s.is_active })} className={`h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${s.is_active ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                {s.is_active ? <><Eye className="w-3.5 h-3.5"/>Visible</> : <><EyeOff className="w-3.5 h-3.5"/>Hidden</>}
              </button>
              <button onClick={() => remove(s.id)} className="h-8 w-8 rounded-lg border border-rose-200 text-rose-600 grid place-items-center hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Category (small tag)" value={s.data.category ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, category: v } })} />
            <Field label="Title" value={s.data.title ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, title: v } })} />
            <TextArea label="Subtitle" value={s.data.subtitle ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, subtitle: v } })} />
            <Field label="Image URL (optional)" value={s.data.image_url ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, image_url: v } })} placeholder="https://..." />
            <Field label="Primary CTA text" value={s.data.cta ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, cta: v } })} />
            <Field label="Primary CTA link" value={s.data.link ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, link: v } })} placeholder="/products" />
            <Field label="Secondary CTA text" value={s.data.secondary_cta ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, secondary_cta: v } })} />
            <Field label="Secondary CTA link" value={s.data.secondary_link ?? ""} onChange={(v) => patch(s.id, { data: { ...s.data, secondary_link: v } })} placeholder="/categories" />
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color Preset</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => patch(s.id, { data: { ...s.data, color_preset: c } })}
                    className={`h-9 px-3 rounded-lg text-xs font-bold capitalize border ${s.data.color_preset === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {busyId === s.id && <div className="text-xs text-violet-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>Saving…</div>}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => local !== value && onChange(local)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300" />
    </div>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <textarea value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => local !== value && onChange(local)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300" />
    </div>
  );
}

/* ==================== Featured Products Tab ==================== */
function FeaturedTab({ cfg, setCfg }: { cfg: HomepageConfig; setCfg: (c: HomepageConfig) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      try { const p = await listProducts(); setProducts(p as Product[]); }
      catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const selected = cfg.featuredProductSlugs;
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  const toggle = (slug: string) => {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug];
    setCfg({ ...cfg, featuredProductSlugs: next });
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[idx], next[j]] = [next[j], next[idx]];
    setCfg({ ...cfg, featuredProductSlugs: next });
  };
  const clear = () => setCfg({ ...cfg, featuredProductSlugs: [] });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) => p.name.toLowerCase().includes(t) || (p.category ?? "").toLowerCase().includes(t));
  }, [q, products]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Selected */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-l-4 border-violet-500 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Featured Products ({selected.length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">খালি রাখলে auto-pick হবে।</p>
          </div>
          <button onClick={clear} className="text-xs font-bold text-rose-600 hover:underline">Clear</button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
          {selected.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">ডান পাশ থেকে product select করুন।</div>
          )}
          {selected.map((slug, idx) => {
            const p = bySlug.get(slug);
            return (
              <div key={slug} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{p?.name ?? slug}</div>
                  <div className="text-[11px] text-slate-500 truncate">{p?.category ?? "(product not found)"}</div>
                </div>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="h-7 w-7 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === selected.length - 1} className="h-7 w-7 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggle(slug)} className="h-7 w-7 rounded-lg border border-rose-200 text-rose-600 grid place-items-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Picker */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-l-4 border-violet-500 space-y-2">
          <h3 className="text-base font-extrabold text-slate-900">All Products</h3>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product…"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
        </div>
        <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
          {loading && <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>}
          {!loading && filtered.map((p) => {
            const on = selected.includes(p.slug);
            return (
              <button key={p.slug} onClick={() => toggle(p.slug)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${on ? "bg-violet-50" : "hover:bg-slate-50"}`}>
                <span className="text-lg">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{p.category}</div>
                </div>
                <span className={`h-6 w-6 rounded-full grid place-items-center text-xs font-bold ${on ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {on ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==================== SEO Tab ==================== */
function SeoTab({ cfg, setCfg }: { cfg: HomepageConfig; setCfg: (c: HomepageConfig) => void }) {
  const set = (k: keyof HomepageConfig["seo"], v: string) =>
    setCfg({ ...cfg, seo: { ...cfg.seo, [k]: v || undefined } });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-l-4 border-violet-500">
        <h3 className="text-base font-extrabold text-slate-900">Homepage SEO</h3>
        <p className="text-xs text-slate-500 mt-0.5">খালি রাখলে default values ব্যবহার হবে।</p>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SeoField label="Page Title" value={cfg.seo.title ?? ""} placeholder="Rama Sub — Digital Products & Software" onChange={(v) => set("title", v)} maxLen={60} />
        <SeoField label="Meta Description" value={cfg.seo.description ?? ""} placeholder="Buy verified digital products, subscriptions..." onChange={(v) => set("description", v)} maxLen={160} textarea />
        <SeoField label="OG Title" value={cfg.seo.ogTitle ?? ""} placeholder="(same as Page Title if empty)" onChange={(v) => set("ogTitle", v)} />
        <SeoField label="OG Description" value={cfg.seo.ogDescription ?? ""} placeholder="(same as Meta Description if empty)" onChange={(v) => set("ogDescription", v)} textarea />
        <SeoField label="OG Image URL" value={cfg.seo.ogImage ?? ""} placeholder="https://ramasub.com/og-cover.jpg" onChange={(v) => set("ogImage", v)} />
      </div>
    </div>
  );
}
function SeoField({ label, value, placeholder, onChange, maxLen, textarea }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void; maxLen?: number; textarea?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        {maxLen && <span className={`text-[10px] font-semibold ${value.length > maxLen ? "text-rose-600" : "text-slate-400"}`}>{value.length}/{maxLen}</span>}
      </div>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
      )}
    </div>
  );
}
