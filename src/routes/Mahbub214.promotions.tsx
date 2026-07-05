import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Save, X, Tag, Calendar, Percent, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard, AdminStatGrid, AdminGlassCard } from "@/components/admin/AdminStatCard";
import { ProductPicker } from "@/components/admin/ProductPicker";

export const Route = createFileRoute("/admin/promotions")({
 component: AdminPromotions,
});

type Promo = {
 id?: string;
 title: string;
 description: string;
 code: string | null;
 badge: string | null;
 product_slug: string | null;
 discount_percent: number | null;
 starts_at: string | null;
 ends_at: string | null;
 is_active: boolean;
};

const empty: Promo = {
 title: "",
 description: "",
 code: "",
 badge: "",
 product_slug: "",
 discount_percent: null,
 starts_at: null,
 ends_at: null,
 is_active: true,
};

function toLocalInput(iso: string | null) {
 if (!iso) return "";
 const d = new Date(iso);
 const pad = (n: number) => String(n).padStart(2, "0");
 return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminPromotions() {
 const [items, setItems] = useState<Promo[]>([]);
 const [loading, setLoading] = useState(true);
 const [editing, setEditing] = useState<Promo | null>(null);
 const [isNew, setIsNew] = useState(false);

 const load = useCallback(async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from("promotions")
 .select("*")
 .order("created_at", { ascending: false });
 if (error) toast.error(error.message);
 setItems((data ?? []) as Promo[]);
 setLoading(false);
 }, []);

 useEffect(() => { load(); }, [load]);

 const save = async () => {
 if (!editing) return;
 const payload = {
 title: editing.title.trim(),
 description: editing.description ?? "",
 code: editing.code?.trim() || null,
 badge: editing.badge?.trim() || null,
 product_slug: editing.product_slug?.trim() || null,
 discount_percent: editing.discount_percent ?? null,
 starts_at: editing.starts_at,
 ends_at: editing.ends_at,
 is_active: editing.is_active,
 };
 if (!payload.title) return toast.error("Title is required");
 if (isNew) {
 const { error } = await supabase.from("promotions").insert(payload);
 if (error) return toast.error(error.message);
 toast.success("Promotion created");
 } else {
 const { error } = await supabase.from("promotions").update(payload).eq("id", editing.id!);
 if (error) return toast.error(error.message);
 toast.success("Promotion updated");
 }
 setEditing(null);
 setIsNew(false);
 load();
 };

 const remove = async (id: string) => {
 if (!confirm("Delete this promotion?")) return;
 const { error } = await supabase.from("promotions").delete().eq("id", id);
 if (error) return toast.error(error.message);
 toast.success("Deleted");
 load();
 };

 const toggleActive = async (p: Promo) => {
 const { error } = await supabase.from("promotions").update({ is_active: !p.is_active }).eq("id", p.id!);
 if (error) return toast.error(error.message);
 load();
 };

 const activeCount = items.filter(p => p.is_active).length;
 const withCode = items.filter(p => !!p.code).length;
 const avgDiscount = (() => {
 const ds = items.map(p => p.discount_percent ?? 0).filter(Boolean);
 return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
 })();

 return (
 <div className="space-y-5 animate-fade-in">
 <div className="flex items-end justify-between gap-3 flex-wrap">
 <div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Promotions</h1>
 <p className="text-sm text-slate-500 mt-1">Discounts, coupon codes and campaigns.</p>
 </div>
 <button
 onClick={() => { setEditing({ ...empty }); setIsNew(true); }}
 className="px-4 h-10 rounded-xl bg-slate-900 ring-1 ring-slate-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_22px_-8px_rgba(100,116,139,0.7)] hover:opacity-95"
 >
 <Plus className="w-4 h-4" /> New promotion
 </button>
 </div>

 <AdminStatGrid>
 <AdminStatCard label="Total Campaigns" value={items.length} delta={10} tone="indigo" loading={loading} />
 <AdminStatCard label="Active" value={activeCount} delta={5} tone="emerald" loading={loading} />
 <AdminStatCard label="With Code" value={withCode} tone="violet" loading={loading} />
 <AdminStatCard label="Avg Discount" value={`${avgDiscount}%`} delta={avgDiscount > 20 ? 8 : -3} tone="rose" loading={loading} />
 </AdminStatGrid>

 <AdminGlassCard className="overflow-hidden p-0">
 {loading ? null : items.length === 0 ? (
 <div className="p-10 text-center text-slate-500">No promotions yet. Create your first campaign.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
 <tr>
 <th className="text-left px-4 py-3">Title</th>
 <th className="text-left px-4 py-3">Code</th>
 <th className="text-left px-4 py-3">Discount</th>
 <th className="text-left px-4 py-3">Ends</th>
 <th className="text-left px-4 py-3">Status</th>
 <th className="text-right px-4 py-3">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {items.map((p) => (
 <tr key={p.id} className="hover:bg-white/60">
 <td className="px-4 py-3">
 <div className="font-semibold text-slate-900">{p.title}</div>
 {p.badge && <div className="text-[10px] text-slate-600 mt-0.5 font-bold">{p.badge}</div>}
 </td>
 <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.code || "—"}</td>
 <td className="px-4 py-3 text-slate-700">{p.discount_percent ? `${p.discount_percent}%` : "—"}</td>
 <td className="px-4 py-3 text-slate-500">{p.ends_at ? new Date(p.ends_at).toLocaleDateString() : "—"}</td>
 <td className="px-4 py-3">
 <button
 onClick={() => toggleActive(p)}
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${p.is_active ? "bg-slate-50 text-slate-700 ring-slate-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}
 >
 {p.is_active ? "Active" : "Paused"}
 </button>
 </td>
 <td className="px-4 py-3 text-right">
 <div className="inline-flex gap-1">
 <button onClick={() => { setEditing(p); setIsNew(false); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
 <button onClick={() => remove(p.id!)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </AdminGlassCard>

 {editing && (
 <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
 <div className="rounded-2xl ring-1 ring-white/60 bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(100,116,139,0.35)] max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-slate-900">{isNew ? "New Promotion" : "Edit Promotion"}</h2>
 <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
 </div>
 <div className="space-y-3 text-sm">
 <Field label="Title"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="admin-input" /></Field>
 <Field label="Description"><textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="admin-input" /></Field>
 <div className="grid grid-cols-2 gap-3">
 <Field label="Code" icon={<Tag className="w-3.5 h-3.5" />}><input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="admin-input" placeholder="SAVE20" /></Field>
 <Field label="Badge"><input value={editing.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} className="admin-input" placeholder="HOT" /></Field>
 </div>
				<div className="grid grid-cols-2 gap-3">
 <Field label="Discount %" icon={<Percent className="w-3.5 h-3.5" />}>
 <input type="number" min={0} max={100} value={editing.discount_percent ?? ""} onChange={(e) => setEditing({ ...editing, discount_percent: e.target.value === "" ? null : Number(e.target.value) })} className="admin-input" />
 </Field>
 <Field label="Product" icon={<Package className="w-3.5 h-3.5" />}>
 <ProductPicker
 value={editing.product_slug ?? ""}
 onChange={(slug, product) => {
 setEditing((prev) => prev ? {
 ...prev,
 product_slug: slug || null,
 // Auto-fill empty fields from the selected product
 title: prev.title?.trim() ? prev.title : (product?.name ?? prev.title),
 description: prev.description?.trim() ? prev.description : (product?.tagline ?? product?.shortDescription ?? prev.description),
 badge: prev.badge?.trim() ? prev.badge : (product?.badge ?? prev.badge),
 } : prev);
 }}
 placeholder="— Select product —"
 />
 </Field>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <Field label="Starts" icon={<Calendar className="w-3.5 h-3.5" />}>
 <input type="datetime-local" value={toLocalInput(editing.starts_at)} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="admin-input" />
 </Field>
 <Field label="Ends" icon={<Calendar className="w-3.5 h-3.5" />}>
 <input type="datetime-local" value={toLocalInput(editing.ends_at)} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="admin-input" />
 </Field>
 </div>
 <label className="flex items-center gap-2 text-slate-700">
 <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
 Active
 </label>
 </div>
 <div className="mt-5 flex justify-end gap-2">
 <button onClick={() => setEditing(null)} className="px-4 h-9 rounded-full ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">Cancel</button>
 <button onClick={save} className="px-4 h-9 rounded-full bg-slate-900 ring-1 ring-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_22px_-8px_rgba(100,116,139,0.7)]"><Save className="w-3.5 h-3.5" /> Save</button>
 </div>
 </div>
 </div>
 )}

 <style>{`
 .admin-input {
 width: 100%;
 background: #fff;
 border: 1px solid #e2e8f0;
 border-radius: 10px;
 padding: 8px 12px;
 color: #0f172a;
 font-size: 13px;
 outline: none;
 }
 .admin-input:focus { border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(100,116,139,0.12); }
 `}</style>
 </div>
 );
}

function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
 return (
 <label className="block">
 <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1 flex items-center gap-1.5">{icon}{label}</span>
 {children}
 </label>
 );
}
