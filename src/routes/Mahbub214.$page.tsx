import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Construction, ArrowLeft, Plus, Trash2, Pencil, Loader2, X, Check, Save, GripVertical, Upload } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { findAdminPage, ADMIN_MENU } from "@/lib/admin-menu";
import { getFeatureConfig, validateField, slugify, type AdminField } from "@/lib/admin-fields";
import { supabase } from "@/integrations/supabase/client";
import { fileToWebp } from "@/lib/image-to-webp";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import { ProductMediaGallery } from "@/components/admin/ProductMediaGallery";
import { BackupRestore } from "@/components/admin/BackupRestore";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export const Route = createFileRoute("/Mahbub214/$page")({
 component: AdminFeaturePage,
});

type Record = {
 id: string;
 kind: string;
 data: Record_;
 is_active: boolean;
 sort_order: number;
 created_at: string;
};
type Record_ = { [k: string]: unknown };

const isBlankValue = (value: unknown) => value == null || value === "";

const mergeMissingValues = (base: Record_, defaults: Record_) => {
 const merged: Record_ = { ...base };
 for (const [key, value] of Object.entries(defaults)) {
 if (isBlankValue(merged[key])) merged[key] = value;
 }
 return merged;
};

function AdminFeaturePage() {
 const { page } = useParams({ from: "/Mahbub214/$page" });
 const item = findAdminPage(`/Mahbub214/${page}`) ?? findAdminPage(`/admin/${page}`);
 const group = ADMIN_MENU.find((g) => g.items.some((i) => i.to === `/Mahbub214/${page}` || i.to === `/admin/${page}`));
 const cfg = getFeatureConfig(page);
 const { t } = useAdminLang();

 if (cfg?.kind === "_redirect_products") return <Navigate to="/Mahbub214/products" />;
 if (cfg?.kind === "_redirect_users") return <Navigate to="/Mahbub214/users" />;

 if (!item) {
 return (
 <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
 <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 grid place-items-center text-slate-500 mb-4">
 <Construction className="w-6 h-6" />
 </div>
 <h1 className="text-xl font-bold text-slate-900">{t("Page not found", "পেজ পাওয়া যায়নি")}</h1>
 <Link to="/Mahbub214" className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-900 text-white text-sm font-semibold">
 <ArrowLeft className="w-4 h-4" /> {t("Back to dashboard", "ড্যাশবোর্ডে ফিরুন")}
 </Link>
 </div>
 );
 }

 const itemLabel = (item as any).labelBn ? t(item.label, (item as any).labelBn) : item.label;
 const groupTitle = group ? ((group as any).titleBn ? t(group.title, (group as any).titleBn) : group.title) : "";

 return (
  <div className="space-y-5">


  {page === "media-gallery" ? (
 <ProductMediaGallery />
 ) : page === "backup" ? (
 <BackupRestore />
 ) : page === "analytics" ? (
 <AnalyticsDashboard />
 ) : page === "software-downloads" ? (
 <SoftwareDownloadsManager />
 ) : cfg ? (
  cfg.mode === "list" ? (
    <>
      {cfg.kind === "ad_campaign" && <AdCampaignMetrics />}
      {cfg.kind === "blog_post" && <BlogAIPanel />}
      <ListCrud kind={cfg.kind} fields={cfg.fields} />
    </>
 ) : (
 <SingleSettings kind={cfg.kind} fields={cfg.fields} />
 )
 ) : (
 <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
 <p className="text-sm text-slate-500">{t("No editor configured for this module yet.", "এই মডিউলের জন্য এডিটর কনফিগার করা হয়নি।")}</p>
 </div>
 )}
 </div>
 );
}

/* ============================== LIST CRUD ============================== */

function ListCrud({ kind, fields }: { kind: string; fields: AdminField[] }) {
 const [rows, setRows] = useState<Record[]>([]);
 const [loading, setLoading] = useState(true);
 const [editing, setEditing] = useState<Record | null>(null);
 const [showForm, setShowForm] = useState(false);
 const { t } = useAdminLang();

 const primary = useMemo(() => fields.find((f) => f.primary) ?? fields[0], [fields]);
 const secondary = useMemo(() => fields.filter((f) => f !== primary).slice(0, 2), [fields, primary]);

 const load = useCallback(async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from("admin_records")
 .select("*")
 .eq("kind", kind)
 .order("sort_order")
 .order("created_at", { ascending: false });
 if (error) toast.error(error.message);
 setRows((data ?? []) as Record[]);
 setLoading(false);
 }, [kind]);

 useEffect(() => { load(); }, [load]);

 const remove = async (id: string) => {
 if (!confirm(t("Delete this entry?", "এই এন্ট্রি মুছে ফেলবেন?"))) return;
 const { error } = await supabase.from("admin_records").delete().eq("id", id);
 if (error) return toast.error(error.message);
 toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
 load();
 };

 const toggleActive = async (row: Record) => {
 const { error } = await supabase
 .from("admin_records")
 .update({ is_active: !row.is_active })
 .eq("id", row.id);
 if (error) return toast.error(error.message);
 load();
 };

 const [dragId, setDragId] = useState<string | null>(null);
 const [overId, setOverId] = useState<string | null>(null);

 const persistOrder = async (next: Record[]) => {
 const changed = next
 .map((r, i) => ({ r, i }))
 .filter(({ r, i }) => r.sort_order !== i);
 if (!changed.length) return;
 const results = await Promise.all(
 changed.map(({ r, i }) =>
 supabase.from("admin_records").update({ sort_order: i }).eq("id", r.id)
 )
 );
 const err = results.find((x) => x.error)?.error;
 if (err) {
 toast.error(err.message);
 load();
 } else {
 toast.success(t("Order saved", "ক্রম সংরক্ষিত হয়েছে"));
 }
 };

 const onDrop = (targetId: string) => {
 if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
 const from = rows.findIndex((r) => r.id === dragId);
 const to = rows.findIndex((r) => r.id === targetId);
 if (from < 0 || to < 0) return;
 const next = rows.slice();
 const [moved] = next.splice(from, 1);
 next.splice(to, 0, moved);
 const renumbered = next.map((r, i) => ({ ...r, sort_order: i }));
 setRows(renumbered);
 setDragId(null); setOverId(null);
 persistOrder(renumbered);
 };

 const [query, setQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

 const searchableNames = useMemo(
 () => [primary, ...secondary].filter(Boolean).map((f) => f!.name),
 [primary, secondary]
 );

 const visibleRows = useMemo(() => {
 const q = query.trim().toLowerCase();
 return rows.filter((r) => {
 if (statusFilter === "active" && !r.is_active) return false;
 if (statusFilter === "inactive" && r.is_active) return false;
 if (!q) return true;
 return searchableNames.some((n) => String(r.data?.[n] ?? "").toLowerCase().includes(q));
 });
 }, [rows, query, statusFilter, searchableNames]);

 const filtering = query.trim() !== "" || statusFilter !== "all";

 return (
 <div className="space-y-4">
 <div className="flex flex-wrap items-center gap-3 justify-between">
 <div className="text-sm text-slate-500">
 {filtering
   ? t(`${visibleRows.length} of ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`,
       `${rows.length} টির মধ্যে ${visibleRows.length} টি এন্ট্রি`)
   : t(`${rows.length} ${rows.length === 1 ? "entry" : "entries"}`,
       `${rows.length} টি এন্ট্রি`)}
 {!filtering && <> · {t("drag", "টেনে")} <GripVertical className="w-3 h-3 inline" /> {t("to reorder", "ক্রম বদলান")}</>}
 </div>
 <button
 onClick={() => { setEditing(null); setShowForm(true); }}
 className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow transition"
 >
 <Plus className="w-4 h-4" /> {t("Add new", "নতুন যোগ করুন")}
 </button>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <div className="flex-1 min-w-[200px]">
 <SearchBar
 value={query}
 onChange={setQuery}
 placeholder={t(
   `Search ${[primary, ...secondary].filter(Boolean).map((f) => f!.label.toLowerCase()).join(", ")}…`,
   "খুঁজুন…"
 )}
 size="md"
 className="w-full"
 />
 </div>
 <div className="inline-flex h-10 rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold">
 {(["all", "active", "inactive"] as const).map((s) => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`px-3 rounded-full capitalize transition ${
 statusFilter === s ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
 }`}
 >
 {t(s, s === "all" ? "সব" : s === "active" ? "সক্রিয়" : "নিষ্ক্রিয়")}
 </button>
 ))}
 </div>
 </div>

   <div className="admin-card rounded-2xl overflow-hidden">
 {loading ? null : visibleRows.length === 0 ? (
 <div className="p-10 text-center text-slate-500">
 {rows.length === 0
   ? t(`No entries yet. Click "Add new" to create the first one.`, `এখনো কোনো এন্ট্রি নেই। "নতুন যোগ করুন" ক্লিক করে শুরু করুন।`)
   : t("No matches for your search.", "আপনার অনুসন্ধানের সাথে কিছু মেলেনি।")}
 </div>
 ) : (
  <div className="overflow-x-auto">
  <table className="w-full text-sm min-w-[760px]">
  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
 <tr>
 <th className="w-8"></th>
 <th className="text-left px-4 py-3">{primary?.label ?? t("Item", "আইটেম")}</th>
 {secondary.map((f) => <th key={f.name} className="text-left px-4 py-3">{f.label}</th>)}
 <th className="text-left px-4 py-3">{t("Status", "স্ট্যাটাস")}</th>
 <th className="text-right px-4 py-3">{t("Actions", "অ্যাকশন")}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {visibleRows.map((r) => (
 <tr
 key={r.id}
 draggable={!filtering}
 onDragStart={(e) => { setDragId(r.id); e.dataTransfer.effectAllowed = "move"; }}
 onDragOver={(e) => { e.preventDefault(); if (overId !== r.id) setOverId(r.id); }}
 onDragLeave={() => { if (overId === r.id) setOverId(null); }}
 onDrop={(e) => { e.preventDefault(); onDrop(r.id); }}
 onDragEnd={() => { setDragId(null); setOverId(null); }}
 className={`hover:bg-slate-50/60 ${dragId === r.id ? "opacity-40" : ""} ${overId === r.id && dragId !== r.id ? "bg-slate-50 outline outline-1 outline-violet-300" : ""}`}
 >
  <td className="px-2 py-3 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-700">
 <GripVertical className="w-4 h-4" />
 </td>
 <td className="px-4 py-3 font-semibold text-slate-900">{String(r.data?.[primary?.name ?? ""] ?? "—")}</td>
 {secondary.map((f) => (
 <td key={f.name} className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
 {renderCell(r.data?.[f.name], f)}
 </td>
 ))}
 <td className="px-4 py-3">
 <button
 onClick={() => toggleActive(r)}
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
 r.is_active
 ? "bg-slate-50 text-slate-700 border-slate-200"
 : "bg-slate-100 text-slate-500 border-slate-200"
 }`}
 >
 {r.is_active ? t("Active", "সক্রিয়") : t("Inactive", "নিষ্ক্রিয়")}
 </button>
 </td>
 <td className="px-4 py-3 text-right">
 <div className="inline-flex gap-1">
 <button
 onClick={() => { setEditing(r); setShowForm(true); }}
 className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
  title={t("Edit", "এডিট")}
 >
 <Pencil className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => remove(r.id)}
 className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
 title={t("Delete", "ডিলিট")}
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
  </table>
  </div>
 )}
 </div>

 {showForm && (
 <RecordForm
 kind={kind}
 fields={fields}
 record={editing}
 onClose={() => setShowForm(false)}
 onSaved={() => { setShowForm(false); load(); }}
 />
 )}
 </div>
 );
}

function renderCell(value: unknown, f: AdminField) {
  if (value == null || value === "") return <span className="font-semibold text-slate-500">—</span>;
 if (f.type === "boolean") return value ? <Check className="w-4 h-4 text-slate-600" /> : <X className="w-4 h-4 text-slate-500" />;
 if (f.type === "image") return <img src={String(value)} alt="" className="w-8 h-8 rounded object-cover" />;
 return String(value);
}

/* ============================== FORM MODAL ============================== */

function RecordForm({
 kind, fields, record, onClose, onSaved,
}: {
 kind: string; fields: AdminField[]; record: Record | null; onClose: () => void; onSaved: () => void;
}) {
 const [data, setData] = useState<Record_>(record?.data ?? {});
 const [saving, setSaving] = useState(false);
 const [errors, setErrors] = useState<{ [k: string]: string }>({});
 const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
 // Track which derived fields the user has manually edited — once edited, stop auto-deriving.
 const [edited, setEdited] = useState<{ [k: string]: boolean }>(() => {
   const init: { [k: string]: boolean } = {};
   for (const f of fields) {
     if (f.autoFrom && record?.data && record.data[f.name] != null && record.data[f.name] !== "") {
       init[f.name] = true;
     }
   }
   return init;
 });
 const { t } = useAdminLang();

 const transform = (mode: AdminField["autoTransform"], v: unknown) => {
   if (mode === "slug") return slugify(String(v ?? ""));
   return v;
 };

 const setField = (name: string, value: unknown) => {
   setData((d) => {
     const next: Record_ = { ...d, [name]: value };
     // auto-derive dependent fields whose source just changed and that the user hasn't manually edited
     for (const df of fields) {
       if (df.autoFrom === name && !edited[df.name]) {
         next[df.name] = transform(df.autoTransform, value);
       }
     }
     return next;
   });
   const f = fields.find((x) => x.name === name);
   if (f) {
     // mark a derived field as "edited" once the user types into it directly
     if (f.autoFrom) setEdited((e) => ({ ...e, [name]: true }));
     const err = validateField(f, value);
     setErrors((e) => ({ ...e, [name]: err ?? "" }));
   }
 };

 const save = async () => {
   // Fill any still-empty auto-derived fields from their source before validating.
   const filled: Record_ = { ...data };
   for (const f of fields) {
     if (f.autoFrom && (filled[f.name] == null || filled[f.name] === "")) {
       filled[f.name] = transform(f.autoTransform, filled[f.autoFrom]);
     }
   }
   const next: { [k: string]: string } = {};
   for (const f of fields) {
     const err = validateField(f, filled[f.name]);
     if (err) next[f.name] = err;
   }
   if (Object.keys(next).length) {
     setData(filled);
     setErrors(next);
     setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));
     toast.error(t("Please fix the highlighted fields", "চিহ্নিত ফিল্ডগুলো ঠিক করুন"));
     return;
   }
   setSaving(true);
   const payload = { kind, data: filled as never, is_active: record?.is_active ?? true };
   const op = record
     ? supabase.from("admin_records").update(payload).eq("id", record.id)
     : supabase.from("admin_records").insert(payload);
   const { error } = await op;
   setSaving(false);
   if (error) return toast.error(error.message);
   toast.success(record ? t("Updated", "আপডেট হয়েছে") : t("Created", "তৈরি হয়েছে"));
   onSaved();
 };


 return (
 <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
 <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
 <h2 className="text-lg font-bold text-slate-900">{record ? t("Edit entry", "এন্ট্রি এডিট") : t("New entry", "নতুন এন্ট্রি")}</h2>
 <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 {fields.map((f) => (
 <FieldInput
 key={f.name}
 field={f}
 value={data[f.name]}
 error={touched[f.name] ? errors[f.name] : ""}
 onBlur={() => setTouched((t) => ({ ...t, [f.name]: true }))}
 onChange={(v) => setField(f.name, v)}
 />
 ))}
 </div>
  <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
  <button onClick={onClose} className="h-10 px-4 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 w-full sm:w-auto">{t("Cancel", "বাতিল")}</button>
  <button onClick={save} disabled={saving} className="h-10 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow inline-flex items-center justify-center gap-1.5 disabled:opacity-60 transition w-full sm:w-auto">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {t("Save", "সংরক্ষণ")}
 </button>
 </div>
 </div>
 </div>
 );
}

/* ============================== SINGLE SETTINGS ============================== */

function SingleSettings({ kind, fields }: { kind: string; fields: AdminField[] }) {
 const [data, setData] = useState<Record_>({});
 const [recordId, setRecordId] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [prefilled, setPrefilled] = useState(false);
 const [errors, setErrors] = useState<{ [k: string]: string }>({});
 const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
 const { t } = useAdminLang();
 const autoSaveGuard = useRef<Set<string>>(new Set());

 useEffect(() => {
 let cancelled = false;
 (async () => {
 setLoading(true);
 setPrefilled(false);
 const { data: rows, error } = await supabase
 .from("admin_records").select("*").eq("kind", kind).order("created_at", { ascending: true }).limit(1);
 if (error) toast.error(error.message);
 if (cancelled) return;
 const row = rows?.[0];
 const savedData = row ? (row.data as Record_) : {};
 if (row) setRecordId(row.id);
 // No saved row yet, or saved row has blank fields — fill missing values from site data.
 let mergedFinal: Record_ = savedData;
 let filledFromDefaults = false;
 try {
 const { getSmartDefaults } = await import("@/lib/admin-smart-defaults");
 const defaults = await getSmartDefaults(kind, fields);
  mergedFinal = mergeMissingValues(savedData, defaults as Record_);
  filledFromDefaults = Object.keys(defaults).some((key) => isBlankValue(savedData[key]) && !isBlankValue(defaults[key]));
  if (cancelled) return;
  setData(mergedFinal);
  setPrefilled(filledFromDefaults);
 } catch { if (!cancelled) setData(savedData); }
 if (cancelled) return;
 setLoading(false);

 // Auto-save prefilled values so the DB stays in sync with what admins see.
 // Guard against React StrictMode double-invoke of the effect.
 if (filledFromDefaults && !autoSaveGuard.current.has(kind)) {
   autoSaveGuard.current.add(kind);
   const allValid = fields.every((f) => !validateField(f, mergedFinal[f.name]));
   if (allValid) {
     // Re-check in case another mount just inserted the row.
     const { data: fresh } = await supabase
       .from("admin_records").select("id").eq("kind", kind).order("created_at", { ascending: true }).limit(1);
     const existingId = fresh?.[0]?.id ?? row?.id ?? null;
     const payload = { kind, data: mergedFinal as never, is_active: true };
     const { data: out } = existingId
       ? await supabase.from("admin_records").update(payload).eq("id", existingId).select().single()
       : await supabase.from("admin_records").insert(payload).select().single();
     if (out && !cancelled) { setRecordId(out.id); setPrefilled(false); }
   }
 }
 })();
 return () => { cancelled = true; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [kind]);

 const setField = (name: string, value: unknown) => {
 setData((d) => ({ ...d, [name]: value }));
 const f = fields.find((x) => x.name === name);
 if (f) setErrors((e) => ({ ...e, [name]: validateField(f, value) ?? "" }));
 };

 const save = async () => {
 const next: { [k: string]: string } = {};
 for (const f of fields) {
 const err = validateField(f, data[f.name]);
 if (err) next[f.name] = err;
 }
 if (Object.keys(next).length) {
 setErrors(next);
 setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));
 toast.error(t("Please fix the highlighted fields", "চিহ্নিত ফিল্ডগুলো ঠিক করুন"));
 return;
 }
 setSaving(true);
 const payload = { kind, data: data as never, is_active: true };
 const { data: out, error } = recordId
 ? await supabase.from("admin_records").update(payload).eq("id", recordId).select().single()
 : await supabase.from("admin_records").insert(payload).select().single();
 setSaving(false);
 if (error) return toast.error(error.message);
 if (out) { setRecordId(out.id); setPrefilled(false); }
 toast.success(t("Saved", "সংরক্ষিত হয়েছে"));
 };

 if (loading) return (
  <div className="admin-card rounded-2xl p-4 sm:p-6 space-y-4">
  <div className="h-9 rounded-xl bg-slate-100 animate-pulse" />
  <div className="grid sm:grid-cols-2 gap-4">
  {fields.slice(0, 6).map((f) => (
  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
  <div className="h-3 w-24 rounded bg-slate-100 mb-2 animate-pulse" />
  <div className={`${f.type === "textarea" || f.type === "image" ? "h-24" : "h-10"} rounded-lg bg-slate-100 animate-pulse`} />
  </div>
  ))}
  </div>
  <p className="text-xs font-semibold text-slate-500">{t("Loading settings…", "সেটিংস লোড হচ্ছে…")}</p>
  </div>
 );

 return (
   <div className="admin-card rounded-2xl p-4 sm:p-6 space-y-5">
 {prefilled && (
 <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[13px] text-violet-900 flex items-center gap-2">
 <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
 {t(
 "Auto-filled from your site data — review and click Save settings to keep it.",
 "আপনার ওয়েবসাইটের তথ্য থেকে auto-fill করা হয়েছে — check করে Save settings চাপুন।"
 )}
 </div>
 )}
 <div className="grid sm:grid-cols-2 gap-4">
 {fields.map((f) => (
 <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
 <FieldInput
 field={f}
 value={data[f.name]}
 error={touched[f.name] ? errors[f.name] : ""}
 onBlur={() => setTouched((t) => ({ ...t, [f.name]: true }))}
 onChange={(v) => setField(f.name, v)}
 />
 </div>
 ))}
 </div>
 <div className="pt-4 border-t border-slate-100 flex justify-end">
 <button onClick={save} disabled={saving} className="h-10 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow inline-flex items-center gap-1.5 disabled:opacity-60 transition">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {t("Save settings", "সেটিংস সংরক্ষণ")}
 </button>
 </div>
 </div>
 );
}

/* ============================== FIELD INPUT ============================== */

function FieldInput({
 field, value, onChange, error, onBlur,
}: {
 field: AdminField; value: unknown; onChange: (v: unknown) => void;
 error?: string; onBlur?: () => void;
}) {
 const hasError = !!error;
 const baseCls = `w-full h-10 px-3 rounded-lg border text-sm text-slate-900 outline-none bg-white ${
 hasError
 ? "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
 : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
 }`;
 const label = (
 <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
 {field.label}{field.required && <span className="text-slate-500"> *</span>}
 </label>
 );
 const v = value ?? "";

 const errMsg = hasError ? <p className="mt-1 text-[11px] font-medium text-slate-600">{error}</p> : null;

 let inner: React.ReactNode;
 switch (field.type) {
 case "textarea":
 inner = (
 <div>{label}
 <textarea value={String(v)} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} maxLength={field.maxLength ?? field.max} className={baseCls + " h-auto py-2 resize-y"} />
 </div>
 ); break;
 case "boolean":
 inner = (
 <div className="flex items-center justify-between gap-3 h-10 px-3 rounded-lg border border-slate-200 bg-white">
 <span className="text-sm font-medium text-slate-700">{field.label}</span>
 <button type="button" onClick={() => { onChange(!value); onBlur?.(); }} className={`w-11 h-6 rounded-full relative transition ${value ? "bg-slate-600" : "bg-slate-300"}`}>
 <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${value ? "left-5" : "left-0.5"}`} />
 </button>
 </div>
 ); break;
 case "select":
 inner = (
 <div>{label}
 <select value={String(v)} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} className={baseCls}>
 <option value="">—</option>
 {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 </div>
 ); break;
 case "number":
 inner = (
 <div>{label}
 <input type="number" min={field.min} max={field.max} value={v === "" ? "" : Number(v)} onBlur={onBlur} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} placeholder={field.placeholder} className={baseCls} />
 </div>
 ); break;
 case "color":
 inner = (
 <div>{label}
 <div className="flex gap-2">
 <input type="color" value={/^#[0-9a-f]{3,6}$/i.test(String(v)) ? String(v) : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 rounded-lg border border-slate-200" />
 <input type="text" value={String(v)} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} placeholder="#94a3b8" className={baseCls} />
 </div>
 </div>
 ); break;
 case "date":
 inner = (
 <div>{label}
 <input type="datetime-local" value={String(v)} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} className={baseCls} />
 </div>
 ); break;
 case "image":
 inner = <ImageField field={field} value={v} label={label} base={baseCls} onChange={onChange} onBlur={onBlur} />;
 break;
 default:
 inner = (
 <div>{label}
 <input
 type={field.type === "url" ? "url" : "text"}
 value={String(v)}
 onBlur={onBlur}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder}
 maxLength={field.maxLength ?? field.max}
 pattern={field.pattern}
 className={baseCls}
 />
 </div>
 );
 }
  const hintMsg = field.hint ? <p className="mt-1 text-[11px] font-medium text-slate-500">{field.hint}</p> : null;
 return <div>{inner}{errMsg}{!hasError && hintMsg}</div>;
}


function ImageField({
 field, value, label, base, onChange, onBlur,
}: {
 field: AdminField; value: unknown; label: React.ReactNode; base: string;
 onChange: (v: unknown) => void; onBlur?: () => void;
}) {
 const [uploading, setUploading] = useState(false);
 const [dragOver, setDragOver] = useState(false);
 const hasImage = !!value && String(value).length > 0;

 const onPick = async (file: File | null) => {
   if (!file) return;
   if (!file.type.startsWith("image/")) return toast.error("Only image files");
   if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
   setUploading(true);
   try {
     const webpFile = await fileToWebp(file, { quality: 0.85, maxDimension: 2000 });
     const ext = webpFile.name.split(".").pop() || "webp";
     const path = `${field.name}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
     const { error } = await supabase.storage.from("admin-uploads").upload(path, webpFile, {
       cacheControl: "3600", upsert: false, contentType: webpFile.type || "image/webp",
     });
     if (error) { setUploading(false); return toast.error(error.message); }
     const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
     onChange(data.publicUrl);
     onBlur?.();
     toast.success("Image uploaded");
   } catch (e) {
     toast.error((e as Error).message || "Upload failed");
   } finally {
     setUploading(false);
   }
 };

 return (
   <div>{label}
     {/* Drop zone with preview */}
     <div
       onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
       onDragLeave={() => setDragOver(false)}
       onDrop={(e) => {
         e.preventDefault();
         setDragOver(false);
         const f = e.dataTransfer.files?.[0];
         if (f) onPick(f);
       }}
       className={`relative mt-1 rounded-xl border-2 border-dashed transition ${
         dragOver
           ? "border-violet-500 bg-violet-50/60"
           : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
       } ${uploading ? "opacity-70 pointer-events-none" : ""}`}
     >
       {hasImage ? (
         <div className="flex items-center gap-3 p-3">
           <img
             src={String(value)}
             alt=""
             className="h-20 w-20 rounded-lg border border-slate-200 object-cover bg-white shrink-0"
           />
           <div className="min-w-0 flex-1">
             <p className="text-xs font-semibold text-slate-600 mb-1">Current image</p>
             <p className="text-xs text-slate-500 truncate">{String(value)}</p>
             <div className="flex flex-wrap gap-2 mt-2">
               <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer hover:bg-violet-700 transition">
                 {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                 Replace
                 <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
               </label>
               <button
                 type="button"
                 onClick={() => { onChange(""); onBlur?.(); }}
                 className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
               >
                 <X className="w-3.5 h-3.5" /> Remove
               </button>
             </div>
           </div>
         </div>
       ) : (
         <label className="flex flex-col items-center justify-center gap-2 py-7 px-4 cursor-pointer text-center">
           <div className="h-11 w-11 rounded-full bg-white border border-slate-200 grid place-items-center shadow-sm">
             {uploading
               ? <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
               : <Upload className="w-5 h-5 text-violet-600" />}
           </div>
           <div>
             <p className="text-sm font-semibold text-slate-700">
               {uploading ? "Uploading…" : "Drop image here or click to upload"}
             </p>
             <p className="text-[11px] text-slate-500 mt-0.5">PNG / JPG / WebP · max 5MB · auto-optimized</p>
           </div>
           <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
         </label>
       )}
     </div>
     {/* URL fallback */}
     <div className="mt-2">
       <input
         type="url"
         value={String(value ?? "")}
         onBlur={onBlur}
         onChange={(e) => onChange(e.target.value)}
         placeholder="…or paste an image URL"
         className={base}
       />
     </div>
   </div>
 );
}

/* ============================== AD CAMPAIGN METRICS ============================== */

function AdCampaignMetrics() {
  const [rows, setRows] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useAdminLang();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_records").select("*").eq("kind", "ad_campaign");
      setRows((data as Record[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const metrics = useMemo(() => {
    let active = 0, spend = 0, budget = 0, revenue = 0, impressions = 0, clicks = 0, conversions = 0;
    for (const r of rows) {
      const d = r.data ?? {};
      if (r.is_active && String(d.status ?? "") !== "paused" && String(d.status ?? "") !== "completed") active++;
      spend += Number(d.spend_to_date ?? 0) || 0;
      budget += Number(d.total_budget ?? 0) || 0;
      revenue += Number(d.revenue ?? 0) || 0;
      impressions += Number(d.impressions ?? 0) || 0;
      clicks += Number(d.clicks ?? 0) || 0;
      conversions += Number(d.conversions ?? 0) || 0;
    }
    const roas = spend > 0 ? revenue / spend : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    return { active, spend, budget, revenue, impressions, clicks, conversions, roas, ctr, cvr, cpc };
  }, [rows]);

  const fmt = (n: number) => n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
  const money = (n: number) => `৳${fmt(n)}`;

  const cards: Array<{ label: string; labelBn: string; value: string; hint?: string; tone: string }> = [
    { label: "Active campaigns", labelBn: "সক্রিয় ক্যাম্পেইন", value: fmt(metrics.active), tone: "from-violet-500 to-green-600" },
    { label: "Total spend", labelBn: "মোট খরচ", value: money(metrics.spend), hint: `budget ${money(metrics.budget)}`, tone: "from-rose-500 to-red-600" },
    { label: "Revenue", labelBn: "আয়", value: money(metrics.revenue), tone: "from-violet-500 to-purple-600" },
    { label: "ROAS", labelBn: "ROAS", value: metrics.roas ? `${metrics.roas.toFixed(2)}x` : "—", hint: "revenue ÷ spend", tone: "from-amber-500 to-orange-600" },
    { label: "Impressions", labelBn: "ইম্প্রেশন", value: fmt(metrics.impressions), tone: "from-sky-500 to-blue-600" },
    { label: "Clicks · CTR", labelBn: "ক্লিক · CTR", value: `${fmt(metrics.clicks)} · ${metrics.ctr.toFixed(2)}%`, tone: "from-indigo-500 to-blue-700" },
    { label: "Conversions · CVR", labelBn: "কনভার্সন · CVR", value: `${fmt(metrics.conversions)} · ${metrics.cvr.toFixed(1)}%`, tone: "from-fuchsia-500 to-pink-600" },
    { label: "Cost per click", labelBn: "প্রতি ক্লিকে খরচ", value: metrics.cpc ? money(metrics.cpc) : "—", tone: "from-slate-600 to-slate-800" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="admin-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13px] font-black text-slate-900">{t("Performance overview", "পারফরম্যান্স ওভারভিউ")}</div>
          <div className="text-[11px] text-slate-500">{t("Live totals across all campaigns", "সব ক্যাম্পেইনের সম্মিলিত হিসাব")}</div>
        </div>
        {metrics.spend > 0 && (
          <div className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${metrics.roas >= 2 ? "bg-violet-50 text-violet-700" : metrics.roas >= 1 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
            {metrics.roas >= 2 ? t("Profitable", "লাভজনক") : metrics.roas >= 1 ? t("Break-even", "সমতাল") : t("Losing money", "লস হচ্ছে")}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-100 bg-white p-3">
            <div className={`inline-block text-[10px] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${c.tone}`}>
              {t(c.label, c.labelBn)}
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">{c.value}</div>
            {c.hint && <div className="text-[10px] text-slate-400 mt-0.5">{c.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== BLOG AI PANEL ============================== */

function BlogAIPanel() {
  const [busy, setBusy] = useState<null | "all" | "topic" | "cron">(null);
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<string>("");
  const { t } = useAdminLang();

  const runAll = async () => {
    setBusy("all");
    setResult("");
    try {
      const mod = await import("@/lib/blogs.functions");
      const r = await mod.generateBlogsForMissingProducts({ data: { limit: 20 } });
      const ok = r.results.filter((x: any) => x.ok).length;
      const fail = r.results.length - ok;
      setResult(
        t(
          `Generated ${ok} post(s). ${fail} failed. Remaining ${r.remaining}.`,
          `${ok} টি পোস্ট তৈরি হয়েছে। ${fail} টি ব্যর্থ। বাকি ${r.remaining} টি।`,
        ),
      );
      toast.success(t("Done", "সম্পন্ন"));
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  const runTopic = async () => {
    if (topic.trim().length < 3) return toast.error(t("Enter a topic", "একটি টপিক লিখুন"));
    setBusy("topic");
    setResult("");
    try {
      const mod = await import("@/lib/blogs.functions");
      const r = await mod.generateBlogFromTopic({ data: { topic: topic.trim() } });
      setResult(t(`Created: ${r.slug}`, `তৈরি হয়েছে: ${r.slug}`));
      toast.success(t("Blog created", "ব্লগ তৈরি হয়েছে"));
      setTopic("");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            ✨ {t("AI Blog Writer", "AI ব্লগ লেখক")}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {t(
              "Auto-generate SEO blog posts for products or any topic. Future products get auto-blogs via scheduled job.",
              "প্রোডাক্ট বা যেকোনো টপিকের জন্য SEO ব্লগ auto তৈরি করুন। ভবিষ্যত প্রোডাক্টে auto-blog scheduled job দিয়ে তৈরি হবে।",
            )}
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow disabled:opacity-60"
        >
          {busy === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t("Generate for all products", "সব প্রোডাক্টের জন্য তৈরি")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("Topic (e.g. Best AI tools for students in Bangladesh)", "টপিক লিখুন…")}
          className="flex-1 min-w-[240px] h-10 px-4 rounded-full border border-slate-200 bg-white text-sm"
          disabled={busy !== null}
        />
        <button
          onClick={runTopic}
          disabled={busy !== null || topic.trim().length < 3}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow disabled:opacity-60"
        >
          {busy === "topic" ? <Loader2 className="w-4 h-4 animate-spin" /> : "✨"}
          {t("Write from topic", "টপিক থেকে লিখুন")}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-violet-100">
        <p className="text-[11px] text-slate-500">
          {t("Auto-blog for future products (runs hourly).", "নতুন প্রোডাক্টের জন্য auto-blog (প্রতি ঘণ্টায় চলবে)।")}
        </p>
        <button
          onClick={async () => {
            setBusy("cron");
            try {
              const mod = await import("@/lib/blogs.functions");
              await mod.enableAutoBlogCron();
              toast.success(t("Auto-blog enabled", "Auto-blog চালু হয়েছে"));
            } catch (e: any) { toast.error(e?.message || String(e)); }
            finally { setBusy(null); }
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-violet-300 text-violet-700 text-xs font-semibold hover:bg-violet-50 disabled:opacity-60"
        >
          {busy === "cron" ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔁"}
          {t("Enable auto-blog", "Auto-blog চালু করুন")}
        </button>
      </div>

      {result && <div className="text-sm text-slate-700 bg-white rounded-lg border border-slate-100 px-3 py-2">{result}</div>}
    </div>
  );
}

/* ============================== SOFTWARE DOWNLOADS MANAGER ============================== */

type SDProduct = {
  slug: string;
  name: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  downloads: Array<{ label: string; url: string; platform?: string; version?: string; size?: string; notes?: string }>;
};

const PLATFORMS = ["windows", "mac", "android", "ios", "web", "other"] as const;

function SoftwareDownloadsManager() {
  const { t } = useAdminLang();
  const [products, setProducts] = useState<SDProduct[] | null>(null);
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const mod = await import("@/lib/software-downloads.functions");
      const list = await mod.listProductsWithDownloads();
      setProducts(list);
    } catch (e: any) {
      toast.error(e?.message || String(e));
      setProducts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const configured = products?.filter((p) => p.downloads.length > 0).length ?? 0;
  const total = products?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-teal-50 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-black text-slate-900">
              💾 {t("Software Download Manager", "সফটওয়্যার ডাউনলোড ম্যানেজার")}
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              {t(
                "Attach one or more download links per product. When an order is marked completed, the link is auto-emailed to the customer and shown in their dashboard.",
                "প্রতিটি প্রোডাক্টে এক বা একাধিক download link যুক্ত করুন। অর্ডার completed হলে link গ্রাহকের ইমেইলে যাবে এবং তাদের dashboard-এ দেখাবে।",
              )}
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="text-slate-500">{t("Products with downloads", "ডাউনলোডসহ প্রোডাক্ট")}</div>
            <div className="text-2xl font-black text-violet-700">{configured}<span className="text-slate-400 text-sm">/{total}</span></div>
          </div>
        </div>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={t("Search product name, slug, category…", "প্রোডাক্ট খুঁজুন…")}
        size="md"
        className="w-full"
      />

      {products === null ? (
        <div className="text-center py-10 text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("Loading products…", "লোড হচ্ছে…")}
        </div>
      ) : visible.length === 0 ? (
        <div className="admin-card rounded-2xl p-10 text-center text-slate-500">
          {t("No products match your search.", "কোনো প্রোডাক্ট পাওয়া যায়নি।")}
        </div>
      ) : (
        <div className="admin-card rounded-2xl divide-y divide-slate-100">
          {visible.map((p) => (
            <div key={p.slug}>
              <button
                onClick={() => setOpenSlug(openSlug === p.slug ? null : p.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-slate-100 grid place-items-center text-slate-500 text-lg">📦</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 truncate">{p.slug} {p.category ? `· ${p.category}` : ""}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.downloads.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold border border-violet-200">
                      {p.downloads.length} {t("link", "লিংক")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                      {t("no link", "লিংক নেই")}
                    </span>
                  )}
                  <span className={`text-slate-400 transition-transform ${openSlug === p.slug ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>
              {openSlug === p.slug && (
                <DownloadEditor
                  product={p}
                  onSaved={(next) => {
                    setProducts((prev) => (prev ? prev.map((x) => (x.slug === p.slug ? { ...x, downloads: next } : x)) : prev));
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadEditor({
  product,
  onSaved,
}: {
  product: SDProduct;
  onSaved: (next: SDProduct["downloads"]) => void;
}) {
  const { t } = useAdminLang();
  const [rows, setRows] = useState(product.downloads);
  const [saving, setSaving] = useState(false);

  const add = () => setRows((r) => [...r, { label: "Setup file", url: "", platform: "windows" }]);
  const patch = (i: number, k: string, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const save = async () => {
    for (const r of rows) {
      if (!r.label.trim()) return toast.error(t("Label is required", "Label লাগবে"));
      if (!/^https?:\/\//i.test(r.url)) return toast.error(t("URL must start with http(s)://", "URL http(s):// দিয়ে শুরু হতে হবে"));
    }
    setSaving(true);
    try {
      const mod = await import("@/lib/software-downloads.functions");
      await mod.setProductDownloads({ data: { slug: product.slug, downloads: rows } });
      toast.success(t("Saved", "সংরক্ষিত"));
      onSaved(rows);
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-4 space-y-3">
      {rows.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4">
          {t("No download links yet. Click ‘Add link’ below.", "কোনো download link নেই। নিচের ‘Add link’ ক্লিক করুন।")}
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start bg-white p-3 rounded-xl border border-slate-200">
          <input
            className="col-span-12 md:col-span-3 h-9 px-3 rounded-lg border border-slate-200 text-sm"
            placeholder={t("Label (e.g. Setup file)", "Label")}
            value={r.label}
            onChange={(e) => patch(i, "label", e.target.value)}
          />
          <select
            className="col-span-6 md:col-span-2 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white"
            value={r.platform || ""}
            onChange={(e) => patch(i, "platform", e.target.value)}
          >
            <option value="">{t("Platform", "প্ল্যাটফর্ম")}</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            className="col-span-6 md:col-span-2 h-9 px-3 rounded-lg border border-slate-200 text-sm"
            placeholder={t("Version", "Version")}
            value={r.version || ""}
            onChange={(e) => patch(i, "version", e.target.value)}
          />
          <input
            className="col-span-12 md:col-span-4 h-9 px-3 rounded-lg border border-slate-200 text-sm"
            placeholder="https://…"
            value={r.url}
            onChange={(e) => patch(i, "url", e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            title={t("Remove", "মুছুন")}
            className="col-span-12 md:col-span-1 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="col-span-12 grid grid-cols-2 gap-2">
            <input
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm"
              placeholder={t("Size (e.g. 2.4 GB)", "সাইজ")}
              value={r.size || ""}
              onChange={(e) => patch(i, "size", e.target.value)}
            />
            <input
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm"
              placeholder={t("Notes (optional)", "নোট")}
              value={r.notes || ""}
              onChange={(e) => patch(i, "notes", e.target.value)}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-violet-300 text-violet-700 text-xs font-semibold hover:bg-violet-50"
        >
          <Plus className="w-3.5 h-3.5" /> {t("Add link", "Link যোগ করুন")}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {t("Save", "সংরক্ষণ")}
        </button>
      </div>
    </div>
  );
}
