import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingCart, RefreshCw, Search, Mail, Phone, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, Loader2, ExternalLink, X, Save,
  TrendingUp, Users, DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/order-recovery")({
  component: OrderRecoveryPage,
});

type Item = { name?: string; qty?: number; price?: number; emoji?: string; planPeriod?: string };
type Row = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  items: Item[];
  subtotal: number;
  total: number;
  coupon_code: string | null;
  status: "pending" | "contacted" | "recovered" | "lost";
  contacted_at: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  admin_note: string | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { label: "Abandoned", bg: "bg-amber-50",    text: "text-amber-700",   icon: AlertTriangle },
  contacted: { label: "Contacted", bg: "bg-sky-50",      text: "text-sky-700",     icon: MessageCircle },
  recovered: { label: "Recovered", bg: "bg-emerald-50",  text: "text-emerald-700", icon: CheckCircle2 },
  lost:      { label: "Lost",      bg: "bg-rose-50",     text: "text-rose-700",    icon: X },
};

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const fmtDate = (s: string) => new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

function OrderRecoveryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase
      .from("abandoned_checkouts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let pending = 0, contacted = 0, recovered = 0, value = 0, recoveredValue = 0;
    rows.forEach(r => {
      if (r.status === "pending") { pending++; value += Number(r.total || 0); }
      if (r.status === "contacted") { contacted++; value += Number(r.total || 0); }
      if (r.status === "recovered") { recovered++; recoveredValue += Number(r.total || 0); }
    });
    return { pending, contacted, recovered, value, recoveredValue, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      return [r.full_name, r.email, r.phone].some(v => (v || "").toLowerCase().includes(term));
    });
  }, [rows, q, statusFilter]);

  const setStatus = async (id: string, status: Row["status"]) => {
    const patch: Partial<Row> = { status };
    if (status === "contacted") patch.contacted_at = new Date().toISOString();
    if (status === "recovered") patch.recovered_at = new Date().toISOString();
    const { error } = await supabase.from("abandoned_checkouts").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } as Row : r));
    toast.success("Status updated");
  };

  const saveNote = async (id: string, note: string) => {
    const { error } = await supabase.from("abandoned_checkouts").update({ admin_note: note }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows(rs => rs.map(r => r.id === id ? { ...r, admin_note: note } : r));
    toast.success("Note saved");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Abandoned" value={String(stats.pending)} icon={AlertTriangle} grad="from-amber-500 to-orange-600" />
          <StatTile label="Contacted" value={String(stats.contacted)} icon={MessageCircle} grad="from-sky-500 to-indigo-600" />
          <StatTile label="Recovered" value={String(stats.recovered)} icon={CheckCircle2} grad="from-emerald-500 to-teal-600" />
          <StatTile label="Recovered Value" value={fmt(stats.recoveredValue)} icon={DollarSign} grad="from-violet-500 to-fuchsia-600" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="all">All statuses</option>
            {Object.keys(STATUS).map(k => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 grid place-items-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShoppingCart className="h-8 w-8 mx-auto text-slate-300" />
              <p className="mt-3 text-sm">No abandoned carts match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const s = STATUS[r.status] ?? STATUS.pending;
                const Ico = s.icon;
                return (
                  <div key={r.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.full_name || "Anonymous"}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
                          <Ico className="h-3 w-3" /> {s.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                        <span><Clock className="inline h-3 w-3 mr-1" />{fmtDate(r.created_at)}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {(r.items || []).slice(0, 3).map(it => `${it.emoji ?? ""} ${it.name ?? ""}`).join(" • ")}
                        {(r.items || []).length > 3 ? ` • +${r.items.length - 3} more` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{fmt(Number(r.total))}</div>
                      {r.coupon_code && <div className="text-[11px] text-emerald-600">Coupon: {r.coupon_code}</div>}
                    </div>
                    {r.phone && (
                      <a
                        href={`https://wa.me/${r.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi " + (r.full_name || "") + ", we noticed you left items in your cart. Need help completing your order?")}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    <a
                      href={`mailto:${r.email}?subject=Complete%20your%20order&body=Hi%20${encodeURIComponent(r.full_name || "")},%20we%20saved%20your%20cart.`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value as Row["status"])}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {Object.keys(STATUS).map(k => <option key={k} value={k}>{STATUS[k].label}</option>)}
                    </select>
                    <button
                      onClick={() => setEditing(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Note
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <NoteModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (note) => { await saveNote(editing.id, note); setEditing(null); }}
        />
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, grad }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; grad: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
      <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function NoteModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState(row.admin_note ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold text-slate-800 text-sm">Admin note for {row.full_name || row.email}</div>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Internal note…" />
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onSave(note); setSaving(false); }}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
