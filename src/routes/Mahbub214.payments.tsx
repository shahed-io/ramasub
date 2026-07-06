import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CreditCard, RefreshCw, Search as SearchIcon, Filter as FilterIcon, Eye, X,
  CheckCircle2, XCircle, Clock, Settings as SettingsIcon, Plus, Pencil, Trash2,
  Phone, Loader2, Copy, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getWalletScreenshotUrl } from "@/lib/wallet.functions";

export const Route = createFileRoute("/Mahbub214/payments")({
  component: AdminPayments,
});

type Order = {
  id: string;
  created_at: string;
  total: number;
  transaction_id: string;
  payment_method: string;
  payment_status: string;
  full_name: string;
  email: string;
  phone: string;
  payment_screenshot_url: string | null;
};

type PaymentMethod = {
  id: string;
  is_active: boolean;
  sort_order: number;
  data: {
    id?: string;
    name?: string;
    number?: string;
    logo_url?: string;
    brand_color?: string;
    instructions?: string;
    send_money_label?: string;
    enable_wallet?: boolean;
    enable_checkout?: boolean;
  };
};

const shortId = (id: string) => "ORD-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
const fmtMoney = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; icon: any; label: string }> = {
    verified: { c: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2, label: "Approved" },
    approved: { c: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2, label: "Approved" },
    pending: { c: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock, label: "Pending" },
    failed: { c: "bg-rose-50 text-rose-700 ring-rose-200", icon: XCircle, label: "Rejected" },
    rejected: { c: "bg-rose-50 text-rose-700 ring-rose-200", icon: XCircle, label: "Rejected" },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.c}`}>
      <Icon className="w-3.5 h-3.5" /> {s.label}
    </span>
  );
}

function AdminPayments() {
  const [tab, setTab] = useState<"proof" | "settings">("proof");
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-600" /> Payments
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Payment proof verification & settings management</p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur rounded-full p-1 ring-1 ring-slate-200 shadow-sm">
        <button
          onClick={() => setTab("proof")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === "proof" ? "bg-white shadow ring-1 ring-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> পেমেন্ট প্রুফ
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === "settings" ? "bg-white shadow ring-1 ring-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> পেমেন্ট সেটিংস
        </button>
      </div>

      {tab === "proof" ? <PaymentProof /> : <PaymentSettings />}
    </div>
  );
}

/* --------------------------- PAYMENT PROOF TAB --------------------------- */

function PaymentProof() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,created_at,total,transaction_id,payment_method,payment_status,full_name,email,phone,payment_screenshot_url")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const all = orders.length;
    const pending = orders.filter((o) => o.payment_status === "pending").length;
    const approved = orders.filter((o) => o.payment_status === "verified" || o.payment_status === "approved").length;
    const rejected = orders.filter((o) => o.payment_status === "failed" || o.payment_status === "rejected").length;
    return { all, pending, approved, rejected };
  }, [orders]);

  const methods = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => o.payment_method && set.add(o.payment_method));
    return Array.from(set);
  }, [orders]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.payment_status !== status) return false;
      if (method !== "all" && o.payment_method !== method) return false;
      if (!term) return true;
      return (
        o.transaction_id?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term) ||
        o.full_name?.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term)
      );
    });
  }, [orders, q, status, method]);

  const updateStatus = async (id: string, next: string) => {
    const prev = orders;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, payment_status: next } : x)));
    setSelected((s) => (s && s.id === id ? { ...s, payment_status: next } : s));
    const { error } = await supabase.from("orders").update({ payment_status: next }).eq("id", id);
    if (error) {
      setOrders(prev);
      toast.error(error.message);
      return;
    }
    toast.success("Payment status updated");
  };

  const cards: Array<{ label: string; value: number; icon: any; color: string }> = [
    { label: "All Payments", value: stats.all, icon: CreditCard, color: "text-violet-600 bg-violet-50 ring-violet-100" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600 bg-amber-50 ring-amber-100" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 ring-emerald-100" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600 bg-rose-50 ring-rose-100" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
              <span className={`inline-grid place-items-center w-9 h-9 rounded-full ring-1 ${c.color}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="mt-3 text-2xl font-bold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by transaction ID, order, customer..."
            className="w-full rounded-xl bg-white pl-9 pr-3 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-violet-300 outline-none"
          />
        </div>
        <div className="relative">
          <FilterIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="appearance-none rounded-xl bg-white pl-9 pr-8 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-violet-300 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Approved</option>
            <option value="failed">Rejected</option>
          </select>
        </div>
        <div className="relative">
          <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="appearance-none rounded-xl bg-white pl-9 pr-8 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-violet-300 outline-none"
          >
            <option value="all">All Methods</option>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Transaction ID</th>
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Submitted</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400">কোনো পেমেন্ট পাওয়া যায়নি</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{o.transaction_id || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{shortId(o.id)}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900 font-medium leading-tight">{o.full_name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{o.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.payment_method}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fmtMoney(o.total)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3"><StatusPill status={o.payment_status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(o)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <ReviewModal order={selected} onClose={() => setSelected(null)} onUpdate={updateStatus} />}
    </div>
  );
}

function ReviewModal({ order, onClose, onUpdate }: { order: Order; onClose: () => void; onUpdate: (id: string, s: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const getUrl = useServerFn(getWalletScreenshotUrl);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!order.payment_screenshot_url) return;
      setImgLoading(true);
      try {
        const res = await getUrl({ data: { path: order.payment_screenshot_url } });
        if (alive) setImgUrl(res.url);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load screenshot");
      } finally {
        if (alive) setImgLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [order.payment_screenshot_url, getUrl]);

  const copy = async () => {
    await navigator.clipboard.writeText(order.transaction_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="text-sm text-slate-500">Payment Review</div>
            <div className="font-mono text-xs text-slate-700">{shortId(order.id)}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-slate-500">Customer</div><div className="font-medium">{order.full_name}</div></div>
            <div><div className="text-xs text-slate-500">Email</div><div className="font-medium truncate">{order.email}</div></div>
            <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium">{order.phone}</div></div>
            <div><div className="text-xs text-slate-500">Method</div><div className="font-medium">{order.payment_method}</div></div>
            <div><div className="text-xs text-slate-500">Amount</div><div className="font-bold text-lg">{fmtMoney(order.total)}</div></div>
            <div>
              <div className="text-xs text-slate-500">Transaction ID</div>
              <button onClick={copy} className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-mono hover:bg-slate-200">
                {order.transaction_id} {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {order.payment_screenshot_url && (
            <div>
              <div className="text-xs text-slate-500 mb-2">Payment Screenshot</div>
              <div className="rounded-xl border border-slate-200 p-2 bg-slate-50 min-h-[200px] grid place-items-center">
                {imgLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> :
                  imgUrl ? <img src={imgUrl} alt="Payment proof" className="max-h-96 rounded-lg object-contain" /> :
                  <span className="text-sm text-slate-400">No preview</span>}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="text-xs text-slate-500 mb-2">Current status</div>
            <StatusPill status={order.payment_status} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t">
          <button onClick={() => onUpdate(order.id, "failed")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-rose-200 text-rose-700 hover:bg-rose-50">
            <XCircle className="w-4 h-4" /> Reject
          </button>
          <button onClick={() => onUpdate(order.id, "pending")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-amber-200 text-amber-700 hover:bg-amber-50">
            <Clock className="w-4 h-4" /> Mark Pending
          </button>
          <button onClick={() => onUpdate(order.id, "verified")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- PAYMENT SETTINGS TAB --------------------------- */

const BLANK: PaymentMethod["data"] = {
  name: "", number: "", logo_url: "", brand_color: "#7c3aed",
  instructions: "", send_money_label: "Send Money",
  enable_wallet: true, enable_checkout: true,
};

function PaymentSettings() {
  const [rows, setRows] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_records")
      .select("id,is_active,sort_order,data")
      .eq("kind", "payment_method")
      .order("sort_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: PaymentMethod) => {
    const prev = rows;
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
    const { error } = await supabase.from("admin_records").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { setRows(prev); toast.error(error.message); }
  };
  const remove = async (r: PaymentMethod) => {
    if (!confirm(`Delete "${r.data.name}"?`)) return;
    const prev = rows;
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    const { error } = await supabase.from("admin_records").delete().eq("id", r.id);
    if (error) { setRows(prev); toast.error(error.message); }
    else toast.success("Deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-violet-600" /> পেমেন্ট নম্বর ম্যানেজমেন্ট
          </h3>
          <p className="text-xs text-slate-500">পেমেন্ট মেথডের নম্বর, লোগো ও তথ্য পরিবর্তন করুন</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> রিসেট
          </button>
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
            <Plus className="w-4 h-4" /> নতুন মেথড
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">কোনো পেমেন্ট মেথড নেই</div>
        ) : rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-slate-200 px-4 py-3 shadow-sm">
            <div className="w-11 h-11 rounded-xl grid place-items-center bg-slate-50 ring-1 ring-slate-100 overflow-hidden shrink-0">
              {r.data.logo_url
                ? <img src={r.data.logo_url} alt="" className="w-full h-full object-cover" />
                : <CreditCard className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900">{r.data.name || "Untitled"}</span>
                {r.data.send_money_label && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    {r.data.send_money_label}
                  </span>
                )}
              </div>
              {r.data.number && (
                <div className="text-sm text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5" /> {r.data.number}
                </div>
              )}
            </div>
            <span className="w-6 h-6 rounded-full ring-2 ring-white shadow" style={{ background: r.data.brand_color || "#7c3aed" }} />
            <button
              onClick={() => toggle(r)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ${
                r.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"
              }`}
              title={r.is_active ? "Active" : "Disabled"}
            >
              {r.is_active ? <Eye className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setEditing(r)}
              className="p-2 rounded-lg text-violet-600 hover:bg-violet-50" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => remove(r)}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <MethodEditor
          initial={editing ?? { id: "", is_active: true, sort_order: rows.length, data: { ...BLANK } }}
          isNew={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function MethodEditor({ initial, isNew, onClose, onSaved }: {
  initial: PaymentMethod; isNew: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState(initial.data);
  const [active, setActive] = useState(initial.is_active);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PaymentMethod["data"]>(k: K, v: PaymentMethod["data"][K]) => setD((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!d.name?.trim()) { toast.error("নাম দিন"); return; }
    setSaving(true);
    const payload = { kind: "payment_method", data: d, is_active: active, sort_order: initial.sort_order };
    const q = isNew
      ? supabase.from("admin_records").insert(payload)
      : supabase.from("admin_records").update({ data: d, is_active: active }).eq("id", initial.id);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="font-semibold text-slate-900">{isNew ? "নতুন পেমেন্ট মেথড" : "মেথড এডিট"}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="নাম">
            <input value={d.name || ""} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="e.g. bKash" />
          </Field>
          <Field label="নম্বর">
            <input value={d.number || ""} onChange={(e) => set("number", e.target.value)} className={inputCls} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Logo URL">
            <input value={d.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} className={inputCls} placeholder="https://..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Send Money Label">
              <input value={d.send_money_label || ""} onChange={(e) => set("send_money_label", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Brand Color">
              <div className="flex items-center gap-2">
                <input type="color" value={d.brand_color || "#7c3aed"} onChange={(e) => set("brand_color", e.target.value)}
                  className="h-10 w-14 rounded-lg cursor-pointer border border-slate-200" />
                <input value={d.brand_color || ""} onChange={(e) => set("brand_color", e.target.value)}
                  className={inputCls} placeholder="#E2136E" />
              </div>
            </Field>
          </div>
          <Field label="Instructions">
            <textarea value={d.instructions || ""} onChange={(e) => set("instructions", e.target.value)}
              rows={4} className={inputCls + " resize-y"} placeholder="১. ...\n২. ..." />
          </Field>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <Toggle label="Active" checked={active} onChange={setActive} />
            <Toggle label="Wallet" checked={!!d.enable_wallet} onChange={(v) => set("enable_wallet", v)} />
            <Toggle label="Checkout" checked={!!d.enable_checkout} onChange={(v) => set("enable_checkout", v)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t">
          <button onClick={onClose} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-violet-300 outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ring-1 transition ${
        checked ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"
      }`}>
      <span>{label}</span>
      <span className={`w-9 h-5 rounded-full relative transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${checked ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}
