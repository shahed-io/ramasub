import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Tag, Calendar, Percent, BadgeDollarSign, TicketPercent, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard, AdminStatGrid, AdminGlassCard } from "@/components/admin/AdminStatCard";
import { ProductPicker } from "@/components/admin/ProductPicker";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Coupon = {
  id?: string;
  code: string;
  description: string;
  type: "percent" | "flat";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count?: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

const empty: Coupon = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  usage_limit: null,
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

function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    if (!code) return toast.error("Code is required");
    if (!(editing.value >= 0)) return toast.error("Value must be ≥ 0");
    if (editing.type === "percent" && editing.value > 100) return toast.error("Percent must be ≤ 100");

    const payload = {
      code,
      description: editing.description?.trim() ?? "",
      type: editing.type,
      value: Number(editing.value),
      min_subtotal: Number(editing.min_subtotal || 0),
      max_discount: editing.max_discount == null || editing.max_discount === ("" as unknown as number)
        ? null : Number(editing.max_discount),
      usage_limit: editing.usage_limit == null || editing.usage_limit === ("" as unknown as number)
        ? null : Number(editing.usage_limit),
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      is_active: editing.is_active,
    };

    if (isNew) {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Coupon created");
    } else {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id!);
      if (error) return toast.error(error.message);
      toast.success("Coupon updated");
    }
    setEditing(null);
    setIsNew(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id!);
    if (error) return toast.error(error.message);
    load();
  };

  const activeCount = items.filter((c) => c.is_active).length;
  const totalRedeemed = items.reduce((s, c) => s + (c.used_count ?? 0), 0);
  const expiredCount = items.filter((c) => c.ends_at && new Date(c.ends_at).getTime() < Date.now()).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage discount codes for cart &amp; checkout.</p>
        </div>
        <button
          onClick={() => { setEditing({ ...empty }); setIsNew(true); }}
          className="px-4 h-10 rounded-xl bg-slate-900 ring-1 ring-slate-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_22px_-8px_rgba(100,116,139,0.7)] hover:opacity-95"
        >
          <Plus className="w-4 h-4" /> New coupon
        </button>
      </div>

      <AdminStatGrid>
        <AdminStatCard label="Total Coupons" value={items.length} tone="indigo" loading={loading} />
        <AdminStatCard label="Active" value={activeCount} tone="emerald" loading={loading} />
        <AdminStatCard label="Redemptions" value={totalRedeemed} tone="violet" loading={loading} />
        <AdminStatCard label="Expired" value={expiredCount} tone="rose" loading={loading} />
      </AdminStatGrid>

      <AdminGlassCard className="overflow-hidden p-0">
        {loading ? null : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <TicketPercent className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No coupons yet. Create your first discount code.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Discount</th>
                  <th className="text-left px-4 py-3">Min order</th>
                  <th className="text-left px-4 py-3">Usage</th>
                  <th className="text-left px-4 py-3">Window</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => {
                  const expired = c.ends_at && new Date(c.ends_at).getTime() < Date.now();
                  return (
                    <tr key={c.id} className="hover:bg-white/60">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{c.code}</div>
                        {c.description && <div className="text-[11px] text-slate-500 mt-0.5">{c.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.type === "percent" ? `${c.value}%` : `৳${c.value}`}
                        {c.max_discount != null && c.type === "percent" && (
                          <div className="text-[10px] text-slate-400">max ৳{c.max_discount}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.min_subtotal > 0 ? `৳${c.min_subtotal}` : "—"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.used_count ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"}
                        {" → "}
                        {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "∞"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                            expired ? "bg-rose-50 text-rose-700 ring-rose-200" :
                            c.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                            "bg-slate-50 text-slate-500 ring-slate-200"
                          }`}
                        >
                          {expired ? "Expired" : c.is_active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => { setEditing(c); setIsNew(false); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(c.id!)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminGlassCard>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="rounded-2xl ring-1 ring-white/60 bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(100,116,139,0.35)] max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{isNew ? "New Coupon" : "Edit Coupon"}</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <Field label="Code" icon={<Tag className="w-3.5 h-3.5" />}>
                <input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  className="admin-input font-mono"
                  placeholder="SAVE20"
                />
              </Field>
              <Field label="Reference product (optional)" icon={<Package className="w-3.5 h-3.5" />}>
                <ProductPicker
                  value=""
                  allowClear={false}
                  placeholder="Auto-fill description from product…"
                  onChange={(_slug, product) => {
                    if (!product) return;
                    setEditing((prev) => prev ? {
                      ...prev,
                      description: prev.description?.trim()
                        ? prev.description
                        : `${product.name} — ${product.tagline ?? product.category}`,
                    } : prev);
                    toast.success(`Description filled from ${product.name}`);
                  }}
                />
              </Field>
              <Field label="Description">
                <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="admin-input" placeholder="20% off everything" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as "percent" | "flat" })}
                    className="admin-input"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (৳)</option>
                  </select>
                </Field>
                <Field label="Value" icon={editing.type === "percent" ? <Percent className="w-3.5 h-3.5" /> : <BadgeDollarSign className="w-3.5 h-3.5" />}>
                  <input
                    type="number" min={0}
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
                    className="admin-input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min order (৳)">
                  <input type="number" min={0} value={editing.min_subtotal}
                    onChange={(e) => setEditing({ ...editing, min_subtotal: Number(e.target.value) })}
                    className="admin-input" />
                </Field>
                <Field label="Max discount (৳)">
                  <input type="number" min={0}
                    value={editing.max_discount ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_discount: e.target.value === "" ? null : Number(e.target.value) })}
                    className="admin-input" placeholder="No cap" />
                </Field>
              </div>
              <Field label="Usage limit">
                <input type="number" min={0}
                  value={editing.usage_limit ?? ""}
                  onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value === "" ? null : Number(e.target.value) })}
                  className="admin-input" placeholder="Unlimited" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts" icon={<Calendar className="w-3.5 h-3.5" />}>
                  <input type="datetime-local"
                    value={toLocalInput(editing.starts_at)}
                    onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="admin-input" />
                </Field>
                <Field label="Ends" icon={<Calendar className="w-3.5 h-3.5" />}>
                  <input type="datetime-local"
                    value={toLocalInput(editing.ends_at)}
                    onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="admin-input" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 h-9 rounded-full ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={save} className="px-4 h-9 rounded-full bg-slate-900 ring-1 ring-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_22px_-8px_rgba(100,116,139,0.7)]">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
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
