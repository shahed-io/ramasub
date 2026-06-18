import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin, RefreshCw, Search, ExternalLink, Loader2, X, Save, Truck,
  Package, CheckCircle2, Clock, Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tracking")({
  component: TrackingPage,
});

type Order = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  total: number;
  created_at: string;
};

type TrackData = { order_ref: string; courier?: string; tracking_no?: string; url?: string; note?: string };
type TrackRow = { id: string; kind: string; data: TrackData; created_at: string };

const COURIERS = [
  { value: "pathao", label: "Pathao", url: (n: string) => `https://merchant.pathao.com/tracking?consignment_id=${n}` },
  { value: "redx", label: "RedX", url: (n: string) => `https://redx.com.bd/track-parcel/?trackingId=${n}` },
  { value: "steadfast", label: "Steadfast", url: (n: string) => `https://steadfast.com.bd/track/${n}` },
  { value: "sundarban", label: "Sundarban", url: () => `https://www.sundarbancourierltd.com/track` },
  { value: "ecourier", label: "eCourier", url: (n: string) => `https://staging.ecourier.com.bd/track-parcel?ref=${n}` },
  { value: "custom", label: "Custom", url: () => "" },
];

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const fmtDate = (s: string) => new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tracks, setTracks] = useState<Record<string, TrackRow>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "untracked">("all");
  const [editing, setEditing] = useState<Order | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const [ord, trk] = await Promise.all([
      supabase.from("orders").select("id,full_name,email,phone,status,total,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("admin_records").select("*").eq("kind", "tracking_link"),
    ]);
    if (ord.error) toast.error(ord.error.message);
    if (trk.error) toast.error(trk.error.message);
    setOrders((ord.data ?? []) as Order[]);
    const map: Record<string, TrackRow> = {};
    ((trk.data ?? []) as unknown as TrackRow[]).forEach(t => { if (t.data?.order_ref) map[t.data.order_ref] = t; });
    setTracks(map);
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let tracked = 0;
    orders.forEach(o => { if (tracks[o.id]) tracked++; });
    return { total: orders.length, tracked, untracked: orders.length - tracked };
  }, [orders, tracks]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter(o => {
      const has = !!tracks[o.id];
      if (filter === "tracked" && !has) return false;
      if (filter === "untracked" && has) return false;
      if (!term) return true;
      const t = tracks[o.id]?.data;
      return [o.full_name, o.email, o.phone, t?.tracking_no, t?.courier].some(v => (v || "").toLowerCase().includes(term));
    });
  }, [orders, tracks, q, filter]);

  const saveTracking = async (orderId: string, data: TrackData) => {
    const existing = tracks[orderId];
    if (existing) {
      const { error } = await supabase.from("admin_records").update({ data }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      setTracks({ ...tracks, [orderId]: { ...existing, data } });
    } else {
      const { data: ins, error } = await supabase.from("admin_records").insert({ kind: "tracking_link", data, is_active: true }).select().single();
      if (error) { toast.error(error.message); return; }
      setTracks({ ...tracks, [orderId]: ins as unknown as TrackRow });
    }
    toast.success("Tracking saved");
  };

  const removeTracking = async (orderId: string) => {
    const existing = tracks[orderId];
    if (!existing) return;
    if (!confirm("Remove tracking info?")) return;
    const { error } = await supabase.from("admin_records").delete().eq("id", existing.id);
    if (error) { toast.error(error.message); return; }
    const { [orderId]: _, ...rest } = tracks;
    setTracks(rest);
    toast.success("Removed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-cyan-50/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total Orders" value={String(stats.total)} icon={Package} grad="from-sky-500 to-indigo-600" />
          <StatTile label="Tracked" value={String(stats.tracked)} icon={CheckCircle2} grad="from-emerald-500 to-teal-600" />
          <StatTile label="Awaiting Tracking" value={String(stats.untracked)} icon={Clock} grad="from-amber-500 to-orange-600" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, tracking #, courier…"
              className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "tracked" | "untracked")} className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm">
            <option value="all">All orders</option>
            <option value="tracked">Tracked</option>
            <option value="untracked">Untracked</option>
          </select>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 grid place-items-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Truck className="h-8 w-8 mx-auto text-slate-300" />
              <p className="mt-3 text-sm">No orders match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((o) => {
                const t = tracks[o.id]?.data;
                const courier = COURIERS.find(c => c.value === t?.courier);
                const url = t?.url || (courier && t?.tracking_no ? courier.url(t.tracking_no) : "");
                return (
                  <div key={o.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-semibold text-slate-800">{o.full_name || o.email}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        #{o.id.slice(0, 8).toUpperCase()} · {fmtDate(o.created_at)} · {fmt(Number(o.total))}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{o.email}{o.phone ? ` · ${o.phone}` : ""}</div>
                    </div>
                    {t ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">{(courier?.label || t.courier || "Courier")}</span>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">{t.tracking_no || "—"}</code>
                        {t.tracking_no && (
                          <button onClick={() => { navigator.clipboard.writeText(t.tracking_no!); toast.success("Copied"); }} className="grid place-items-center h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"><Copy className="h-3 w-3" /></button>
                        )}
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs"><ExternalLink className="h-3 w-3" /> Track</a>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">No tracking</span>
                    )}
                    <button onClick={() => setEditing(o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
                      {t ? "Edit" : "Add tracking"}
                    </button>
                    {t && (
                      <button onClick={() => removeTracking(o.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs text-rose-600 hover:bg-rose-50">
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TrackingModal
          order={editing}
          current={tracks[editing.id]?.data}
          onClose={() => setEditing(null)}
          onSave={async (data) => { await saveTracking(editing.id, { ...data, order_ref: editing.id }); setEditing(null); }}
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

function TrackingModal({ order, current, onClose, onSave }: { order: Order; current?: TrackData; onClose: () => void; onSave: (data: TrackData) => Promise<void> }) {
  const [courier, setCourier] = useState(current?.courier ?? "pathao");
  const [trackingNo, setTrackingNo] = useState(current?.tracking_no ?? "");
  const [url, setUrl] = useState(current?.url ?? "");
  const [note, setNote] = useState(current?.note ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">Order Tracking</div>
            <div className="font-semibold text-slate-800 text-sm">{order.full_name || order.email}</div>
          </div>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Courier</span>
            <select value={courier} onChange={(e) => setCourier(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {COURIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Tracking #</span>
            <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" placeholder="DA123456" />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Custom Track URL (optional)</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="https://…" />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onSave({ order_ref: order.id, courier, tracking_no: trackingNo.trim(), url: url.trim() || undefined, note: note.trim() || undefined }); setSaving(false); }}
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
