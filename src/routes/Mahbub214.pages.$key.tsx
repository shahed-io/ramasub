import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageRenderer } from "@/components/PageRenderer";
import { newBlock, BLOCK_TYPES, type PageBlock, type PageContent, type PageSeo, type PageStatus, type SitePage } from "@/lib/pages";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, Copy, Eye, Settings, Search,
  Type, Image as ImageIcon, MousePointer2, Minus, Code2, HelpCircle, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";

export const Route = createFileRoute("/Mahbub214/pages/$key")({
  component: PageEditor,
});

type Tab = "content" | "seo" | "settings";

const BLOCK_ICONS: Record<string, any> = {
  heading: Type, paragraph: AlignLeft, image: ImageIcon, button: MousePointer2, divider: Minus, html: Code2, faq: HelpCircle,
};

function PageEditor() {
  const { key } = useParams({ from: "/Mahbub214/pages/$key" });
  const navigate = useNavigate();
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.from("site_pages").select("*").eq("key", key).maybeSingle().then(({ data, error }) => {
      if (!alive) return;
      if (error) toast.error(error.message);
      setPage((data as SitePage) ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [key]);

  function update<K extends keyof SitePage>(k: K, v: SitePage[K]) {
    setPage((p) => (p ? { ...p, [k]: v } : p));
    setDirty(true);
  }

  function updateContent(v: Partial<PageContent>) {
    setPage((p) => (p ? { ...p, content: { blocks: p.content?.blocks ?? [], text_zones: p.content?.text_zones ?? {}, section_toggles: p.content?.section_toggles ?? {}, ...v } } : p));
    setDirty(true);
  }

  function updateSeo(v: Partial<PageSeo>) {
    setPage((p) => (p ? { ...p, seo: { ...(p.seo || {}), ...v } } : p));
    setDirty(true);
  }

  async function save() {
    if (!page) return;
    setSaving(true);
    const { error } = await supabase.from("site_pages").update({
      title: page.title,
      status: page.status,
      seo: page.seo,
      content: page.content,
      show_in_menu: page.show_in_menu,
    }).eq("id", page.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDirty(false);
    toast.success("Page saved");
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!page) return (
    <div className="max-w-xl mx-auto p-10 text-center">
      <h2 className="text-xl font-bold mb-2">Page not found</h2>
      <p className="text-sm text-slate-500 mb-4">No page exists for key "{key}".</p>
      <Link to="/Mahbub214/pages" className="inline-flex items-center gap-1.5 text-blue-600 font-semibold"><ArrowLeft className="w-4 h-4" /> Back to Pages</Link>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto min-w-0">
      <AdminPageHeader />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to="/Mahbub214/pages" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0" title="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <input
              value={page.title}
              onChange={(e) => update("title", e.target.value)}
              className="text-xl md:text-2xl font-extrabold bg-transparent outline-none border-b border-transparent focus:border-blue-300 w-full"
            />
            <div className="text-xs text-slate-500 mt-0.5"><code className="px-1.5 py-0.5 rounded bg-slate-100">{page.path}</code> · {page.page_type}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={page.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5" /> Preview live
          </a>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 p-1 mb-4 w-fit">
        {(["content", "seo", "settings"] as Tab[]).map((t) => {
          const Icon = t === "content" ? Type : t === "seo" ? Search : Settings;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold ${tab === t ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      {tab === "content" && (
        <ContentTab
          page={page}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          updateContent={updateContent}
        />
      )}
      {tab === "seo" && <SeoTab seo={page.seo} onChange={updateSeo} />}
      {tab === "settings" && (
        <SettingsTab
          page={page}
          onStatus={(s) => update("status", s)}
          onMenuToggle={(v) => update("show_in_menu", v)}
          onTextZonesChange={(tz) => updateContent({ text_zones: tz })}
        />
      )}
    </div>
  );
}

/* ------------------------------ CONTENT TAB ------------------------------ */

function ContentTab({
  page, previewMode, setPreviewMode, updateContent,
}: {
  page: SitePage;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  updateContent: (v: Partial<PageContent>) => void;
}) {
  const blocks = page.content?.blocks ?? [];

  const addBlock = (type: PageBlock["type"]) => {
    updateContent({ blocks: [...blocks, newBlock(type)] });
  };
  const setBlock = (id: string, patch: Partial<PageBlock>) => {
    updateContent({ blocks: blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as PageBlock) : b)) });
  };
  const remove = (id: string) => updateContent({ blocks: blocks.filter((b) => b.id !== id) });
  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    updateContent({ blocks: next });
  };
  const duplicate = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    const copy = { ...b, id: `b_${Math.random().toString(36).slice(2, 9)}` } as PageBlock;
    const i = blocks.findIndex((x) => x.id === id);
    const next = blocks.slice();
    next.splice(i + 1, 0, copy);
    updateContent({ blocks: next });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5">
      <div className="min-w-0 space-y-3 bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800">Content blocks</h2>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />
            Preview
          </label>
        </div>

        {previewMode ? (
          blocks.length === 0
            ? <div className="p-10 text-center text-sm text-slate-500">No blocks yet. Add some from the right panel.</div>
            : <div className="border border-slate-200 rounded-xl bg-slate-50/50"><PageRenderer blocks={blocks} /></div>
        ) : blocks.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-sm text-slate-500">No blocks yet.</div>
            <div className="text-xs text-slate-400 mt-1">Add blocks from the right panel →</div>
          </div>
        ) : (
          blocks.map((b, i) => (
            <BlockRow
              key={b.id} block={b} first={i === 0} last={i === blocks.length - 1}
              onChange={(patch) => setBlock(b.id, patch)}
              onMove={(d) => move(b.id, d)}
              onDuplicate={() => duplicate(b.id)}
              onRemove={() => remove(b.id)}
            />
          ))
        )}
      </div>

      {/* Add block panel */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-4">
          <h3 className="font-bold text-sm text-slate-700 mb-3">Add block</h3>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map((bt) => {
              const Icon = BLOCK_ICONS[bt.type] ?? Type;
              return (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-slate-700"
                >
                  <Icon className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-semibold">{bt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Blocks render on the live page in order. Use ↑↓ to reorder.
          </p>
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  block, first, last, onChange, onMove, onDuplicate, onRemove,
}: {
  block: PageBlock;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<PageBlock>) => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const Icon = BLOCK_ICONS[block.type] ?? Type;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 group">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
          {block.type}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={first} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30" title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => onMove(1)} disabled={last} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30" title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-slate-200" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-rose-100 text-rose-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <BlockEditorFields block={block} onChange={onChange} />
    </div>
  );
}

function BlockEditorFields({ block, onChange }: { block: PageBlock; onChange: (patch: Partial<PageBlock>) => void }) {
  const inp = "w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-200";
  const ta = "w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-y min-h-[80px]";

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <input className={inp} value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Heading text" />
          <div className="flex items-center gap-2">
            <select value={block.level} onChange={(e) => onChange({ level: Number(e.target.value) as 1 | 2 | 3 })} className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs">
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white">
              {(["left", "center", "right"] as const).map((a) => {
                const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                return (
                  <button key={a} onClick={() => onChange({ align: a })} className={`p-2 ${block.align === a ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`} title={a}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    case "paragraph":
      return <textarea className={ta} value={block.html} onChange={(e) => onChange({ html: e.target.value })} placeholder="Paragraph HTML (basic tags allowed)" />;
    case "image":
      return (
        <div className="space-y-2">
          <input className={inp} value={block.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="Image URL (https://…)" />
          <input className={inp} value={block.alt ?? ""} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Alt text" />
          <input className={inp} value={block.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption (optional)" />
        </div>
      );
    case "button":
      return (
        <div className="space-y-2">
          <input className={inp} value={block.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Button label" />
          <input className={inp} value={block.href} onChange={(e) => onChange({ href: e.target.value })} placeholder="Link URL" />
          <select value={block.variant ?? "primary"} onChange={(e) => onChange({ variant: e.target.value as any })} className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs">
            <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="ghost">Ghost</option>
          </select>
        </div>
      );
    case "divider":
      return <div className="text-xs text-slate-400">A horizontal divider line.</div>;
    case "html":
      return <textarea className={`${ta} font-mono text-xs`} value={block.code} onChange={(e) => onChange({ code: e.target.value })} placeholder="<div>Custom HTML…</div>" />;
    case "faq":
      return (
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <div key={i} className="p-2 rounded-lg bg-white border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <input className={inp} value={it.q} onChange={(e) => { const items = block.items.slice(); items[i] = { ...it, q: e.target.value }; onChange({ items }); }} placeholder="Question" />
                <button onClick={() => onChange({ items: block.items.filter((_, x) => x !== i) })} className="p-1.5 rounded text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <textarea className={ta} value={it.a} onChange={(e) => { const items = block.items.slice(); items[i] = { ...it, a: e.target.value }; onChange({ items }); }} placeholder="Answer" />
            </div>
          ))}
          <button onClick={() => onChange({ items: [...block.items, { q: "New question", a: "Answer" }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
            <Plus className="w-3 h-3" /> Add FAQ item
          </button>
        </div>
      );
  }
}

/* -------------------------------- SEO TAB -------------------------------- */

function SeoTab({ seo, onChange }: { seo: PageSeo; onChange: (v: Partial<PageSeo>) => void }) {
  const inp = "w-full h-11 px-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4 max-w-2xl">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">SEO title</label>
        <input className={inp} value={seo.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Page title shown on Google" maxLength={70} />
        <div className="text-[11px] text-slate-400 mt-1">{(seo.title ?? "").length}/60 recommended</div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Meta description</label>
        <textarea className={`${inp} h-24 py-2`} value={seo.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Short summary shown under the title on Google" maxLength={180} />
        <div className="text-[11px] text-slate-400 mt-1">{(seo.description ?? "").length}/160 recommended</div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">OG image URL (share preview)</label>
        <input className={inp} value={seo.og_image ?? ""} onChange={(e) => onChange({ og_image: e.target.value })} placeholder="https://…/preview.jpg" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Canonical URL override</label>
        <input className={inp} value={seo.canonical ?? ""} onChange={(e) => onChange({ canonical: e.target.value })} placeholder="Leave blank to use the page path" />
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!seo.noindex} onChange={(e) => onChange({ noindex: e.target.checked })} />
        <span className="font-semibold text-slate-700">Hide from search engines (noindex)</span>
      </label>
    </div>
  );
}

/* ------------------------------ SETTINGS TAB ----------------------------- */

function SettingsTab({
  page, onStatus, onMenuToggle, onTextZonesChange,
}: {
  page: SitePage;
  onStatus: (s: PageStatus) => void;
  onMenuToggle: (v: boolean) => void;
  onTextZonesChange: (tz: Record<string, string>) => void;
}) {
  const zones = page.content?.text_zones ?? {};
  const zoneKeys = Object.keys(zones);

  return (
    <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-slate-800">Publish status</h3>
        <div className="space-y-2">
          {(["published", "draft", "hidden"] as PageStatus[]).map((s) => (
            <label key={s} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50">
              <input type="radio" name="status" checked={page.status === s} onChange={() => onStatus(s)} className="mt-1" />
              <div className="min-w-0">
                <div className="font-semibold text-sm capitalize">{s}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {s === "published" && "Visible to everyone. Included in sitemap."}
                  {s === "draft" && "Only admins can view. Not in sitemap."}
                  {s === "hidden" && "404 for all users including admins on the public route."}
                </div>
              </div>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm pt-2 border-t border-slate-100">
          <input type="checkbox" checked={page.show_in_menu} onChange={(e) => onMenuToggle(e.target.checked)} />
          <span className="font-semibold text-slate-700">Show in site menu</span>
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <h3 className="font-bold text-slate-800">Text zones</h3>
          <p className="text-xs text-slate-500 mt-1">Editable text labels the frontend reads (e.g. page title, empty message, button labels).</p>
        </div>
        {zoneKeys.length === 0 && <div className="text-xs text-slate-400">This page has no text zones defined.</div>}
        {zoneKeys.map((k) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{k}</label>
            <input
              value={zones[k]}
              onChange={(e) => onTextZonesChange({ ...zones, [k]: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
