import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Eye, Trash2, MessageCircle, RefreshCw, Search as SearchIcon,
  Mail, Phone, ArrowRight, FileText, Clock, Package, X, CheckCircle2, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/abandoned-checkout")({
  component: AbandonedCheckoutPage,
});

type Item = { slug?: string; name: string; planPeriod?: string; qty?: number; price: number; emoji?: string };
type Row = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  items: Item[];
  subtotal: number;
  total: number;
  coupon_code: string | null;
  sender_number: string | null;
  transaction_id: string | null;
  payment_method: string | null;
  payment_screenshot_url: string | null;
  customer_note: string | null;
  checkout_step: number;
  status: "pending" | "contacted" | "recovered" | "lost";
  contacted_at: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

const fmtMoney = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function relativeTime(iso: string, t: (en: string, bn: string) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("just now", "এইমাত্র");
  if (m < 60) return `${m}${t("m ago", " মি. আগে")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("h ago", " ঘ. আগে")}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}${t("d ago", " দিন আগে")}`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const AVATAR_TONES = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];
function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function AbandonedCheckoutPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "all" | "recovered" | "contacted">("pending");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("abandoned_checkouts" as never) as unknown as {
        select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }> };
      })
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: update the list within ~1s when rows are inserted/updated/deleted.
  useEffect(() => {
    const channel = supabase
      .channel("admin-abandoned-checkouts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "abandoned_checkouts" },
        (payload) => {
          const evt = payload.eventType;
          if (evt === "INSERT") {
            const row = payload.new as Row;
            setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
          } else if (evt === "UPDATE") {
            const row = payload.new as Row;
            setRows((prev) => {
              const exists = prev.some((r) => r.id === row.id);
              return exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev];
            });
            setSelected((s) => (s && s.id === row.id ? row : s));
          } else if (evt === "DELETE") {
            const oldRow = payload.old as { id?: string };
            if (oldRow?.id) setRows((prev) => prev.filter((r) => r.id !== oldRow.id));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateRow = async (id: string, patch: Partial<Row>) => {
    const prev = rows;
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...patch } as Row : x));
    setSelected((s) => s && s.id === id ? { ...s, ...patch } as Row : s);
    const { error } = await (supabase
      .from("abandoned_checkouts" as never) as unknown as {
        update: (p: Partial<Row>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      })
      .update(patch)
      .eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); return; }
  };

  const deleteRow = async (id: string) => {
    if (!confirm(t("Delete this abandoned checkout?", "এই অ্যাবান্ডনড চেকআউট ডিলিট করবেন?"))) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await (supabase
      .from("abandoned_checkouts" as never) as unknown as {
        delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      })
      .delete()
      .eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); return; }
    toast.success(t("Deleted", "ডিলিট হয়েছে"));
    if (selected?.id === id) setSelected(null);
  };

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    recovered: rows.filter((r) => r.status === "recovered").length,
    contacted: rows.filter((r) => r.status === "contacted").length,
    lost: rows.filter((r) => r.status === "lost").length,
  }), [rows]);

  const lostValue = useMemo(
    () => rows.filter((r) => r.status === "pending" || r.status === "lost").reduce((a, r) => a + Number(r.total || 0), 0),
    [rows],
  );
  const recoveredValue = useMemo(
    () => rows.filter((r) => r.status === "recovered").reduce((a, r) => a + Number(r.total || 0), 0),
    [rows],
  );

  const filtered = useMemo(() => rows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.phone?.toLowerCase().includes(s) ||
      r.coupon_code?.toLowerCase().includes(s) ||
      (r.items ?? []).some((it) => it.name?.toLowerCase().includes(s))
    );
  }), [rows, tab, q]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile accent="slate"    label={t("Total", "মোট")}                 value={counts.all}                sub={t("checkouts", "চেকআউট")}       icon={<FileText className="w-3.5 h-3.5" />} loading={loading} />
        <KpiTile accent="amber"    label={t("Pending Recovery", "পেন্ডিং")} value={counts.pending}            sub={fmtMoney(lostValue)}             icon={<Clock className="w-3.5 h-3.5" />}    loading={loading} />
        <KpiTile accent="emerald"  label={t("Recovered", "রিকভারড")}         value={counts.recovered}          sub={fmtMoney(recoveredValue)}        icon={<CheckCircle2 className="w-3.5 h-3.5" />} loading={loading} />
        <KpiTile accent="rose"     label={t("Lost Value", "লস্ট ভ্যালু")}    value={fmtMoney(lostValue)}       sub={`${counts.pending + counts.lost} ${t("open", "খোলা")}`} icon={<Package className="w-3.5 h-3.5" />} loading={loading} />
      </div>

      {/* Table shell */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t("Search by name, email, phone, coupon or product…", "নাম, ইমেইল, ফোন, কুপন বা প্রোডাক্ট...")}
                className="w-full pl-9 pr-3 h-10 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
            <button
              onClick={load}
              title={t("Refresh", "রিফ্রেশ")}
              className="h-10 w-10 grid place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex items-center p-1 bg-slate-100/70 rounded-xl gap-1 self-start md:self-auto">
            <SegTab active={tab === "pending"}   onClick={() => setTab("pending")}   dot="bg-amber-500">   {t("Pending", "পেন্ডিং")} ({counts.pending})</SegTab>
            <SegTab active={tab === "all"}       onClick={() => setTab("all")}       dot="bg-slate-500">   {t("All", "সব")} ({counts.all})</SegTab>
            <SegTab active={tab === "recovered"} onClick={() => setTab("recovered")} dot="bg-emerald-500"> {t("Recovered", "রিকভারড")} ({counts.recovered})</SegTab>
            <SegTab active={tab === "contacted"} onClick={() => setTab("contacted")} dot="bg-sky-500">     {t("Contacted", "কন্টাক্টেড")} ({counts.contacted})</SegTab>
          </div>
        </div>

        {loading ? (
          <div className="p-14 grid place-items-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Customer", "কাস্টমার")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Contact", "কন্টাক্ট")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Items", "আইটেম")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Total", "মোট")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Progress", "প্রগ্রেস")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Timeline", "টাইমলাইন")}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">{t("Actions", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <RowItem
                    key={r.id}
                    row={r}
                    onView={() => setSelected(r)}
                    onContact={() => updateRow(r.id, { status: "contacted", contacted_at: new Date().toISOString() })}
                    onDelete={() => deleteRow(r.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-14 text-center text-slate-400 text-sm">{t("No abandoned checkouts.", "কোনো অ্যাবান্ডনড চেকআউট নেই।")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              {t("Showing", "দেখানো হচ্ছে")} <span className="text-slate-900 font-semibold">{filtered.length}</span> {t("of", "মধ্যে")} <span className="text-slate-900 font-semibold">{counts.all}</span> {t("checkouts", "চেকআউট")}
            </p>
          </div>
        )}
      </div>

      {selected && (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onUpdate={(p) => updateRow(selected.id, p)}
          onDelete={() => deleteRow(selected.id)}
        />
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function KpiTile({ label, value, sub, icon, accent, loading }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  accent: "slate" | "amber" | "emerald" | "rose"; loading?: boolean;
}) {
  const tone: Record<string, string> = {
    slate:    "text-slate-500",
    amber:    "text-amber-600",
    emerald:  "text-emerald-600",
    rose:     "text-rose-600",
  };
  const bg: Record<string, string> = {
    slate:    "bg-slate-100 text-slate-600",
    amber:    "bg-amber-100 text-amber-700",
    emerald:  "bg-emerald-100 text-emerald-700",
    rose:     "bg-rose-100 text-rose-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${tone[accent]}`}>{label}</p>
        <span className={`w-7 h-7 rounded-lg grid place-items-center ${bg[accent]}`}>{icon}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{loading ? "…" : value}</h3>
        {sub && <span className="text-[11px] font-medium text-slate-400 truncate">{sub}</span>}
      </div>
    </div>
  );
}

function SegTab({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: React.ReactNode; dot: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition ${
        active ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const { t } = useAdminLang();
  const m: Record<Row["status"], { cls: string; dot: string; en: string; bn: string }> = {
    pending:   { cls: "bg-amber-50 text-amber-700 border-amber-200/70",     dot: "bg-amber-500",   en: "Pending",   bn: "পেন্ডিং" },
    contacted: { cls: "bg-sky-50 text-sky-700 border-sky-200/70",           dot: "bg-sky-500",     en: "Contacted", bn: "কন্টাক্টেড" },
    recovered: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200/70", dot: "bg-emerald-500", en: "Recovered", bn: "রিকভারড" },
    lost:      { cls: "bg-rose-50 text-rose-700 border-rose-200/70",         dot: "bg-rose-500",    en: "Lost",      bn: "লস্ট" },
  };
  const v = m[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot} ${status === "pending" ? "animate-pulse" : ""}`} />
      {t(v.en, v.bn)}
    </span>
  );
}

function RowItem({ row: r, onView, onContact, onDelete }: { row: Row; onView: () => void; onContact: () => void; onDelete: () => void }) {
  const { t } = useAdminLang();
  const waLink = r.phone
    ? `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${r.full_name}, আপনি আমাদের ওয়েবসাইটে একটি অর্ডার শুরু করেছিলেন। কোনো সাহায্যের প্রয়োজন হলে জানান।`)}`
    : "";
  const itemsCount = (r.items ?? []).reduce((a, it) => a + (it.qty ?? 1), 0);
  const when = new Date(r.created_at);
  return (
    <tr className="group hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={onView}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full grid place-items-center font-bold text-xs ${toneFor(r.email || r.full_name)}`}>
            {initials(r.full_name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{r.full_name || "—"}</div>
            <div className="text-[11px] text-slate-400">{r.user_id ? t("Logged in", "লগড ইন") : t("Guest", "গেস্ট")}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400 shrink-0" /><span className="truncate max-w-[180px]">{r.email}</span></div>
        {r.phone && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3 text-slate-400 shrink-0" />{r.phone}</div>}
        {r.sender_number && <div className="mt-1 text-[10px] text-slate-400">{t("Sender", "পেমেন্ট")}: {r.sender_number}</div>}
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {itemsCount} {t("items", "আইটেম")}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm font-bold text-slate-900">{fmtMoney(Number(r.total))}</td>
      <td className="px-4 py-3.5">
        <div className="text-xs font-semibold text-slate-700">{t("Step", "ধাপ")} {r.checkout_step || 1}/2</div>
        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{r.payment_method || t("Contact only", "শুধু তথ্য")}</div>
      </td>
      <td className="px-4 py-3.5">
        <div className="text-sm text-slate-700">{relativeTime(r.created_at, t)}</div>
        <div className="text-[10px] text-slate-400">{when.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
      </td>
      <td className="px-4 py-3.5"><StatusPill status={r.status} /></td>
      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <IconBtn title={t("View", "দেখুন")} onClick={onView} tone="indigo"><Eye className="w-4 h-4" /></IconBtn>
          <IconBtn title={t("Mark contacted", "কন্টাক্ট করা হয়েছে")} onClick={onContact} tone="sky"><ArrowRight className="w-4 h-4" /></IconBtn>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp"
              className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          <IconBtn title={t("Delete", "ডিলিট")} onClick={onDelete} tone="rose"><Trash2 className="w-4 h-4" /></IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ children, onClick, title, tone }: { children: React.ReactNode; onClick: () => void; title: string; tone: "indigo" | "sky" | "rose" }) {
  const cls: Record<string, string> = {
    indigo: "hover:text-indigo-600 hover:bg-indigo-50",
    sky:    "hover:text-sky-600 hover:bg-sky-50",
    rose:   "hover:text-rose-600 hover:bg-rose-50",
  };
  return (
    <button onClick={onClick} title={title}
      className={`w-8 h-8 grid place-items-center rounded-lg text-slate-400 transition-colors ${cls[tone]}`}>
      {children}
    </button>
  );
}

function DetailDrawer({ row, onClose, onUpdate, onDelete }: { row: Row; onClose: () => void; onUpdate: (p: Partial<Row>) => void; onDelete: () => void }) {
  const { t } = useAdminLang();
  const [note, setNote] = useState(row.admin_note || "");
  useEffect(() => { setNote(row.admin_note || ""); }, [row.id, row.admin_note]);
  const waLink = row.phone ? `https://wa.me/${row.phone.replace(/\D/g, "")}` : "";
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex justify-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideInRight 260ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-full grid place-items-center font-bold text-sm ${toneFor(row.email || row.full_name)}`}>
              {initials(row.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-slate-900 text-base truncate">{row.full_name || t("Guest", "গেস্ট")}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusPill status={row.status} />
                <span className="text-[11px] text-slate-400">{row.user_id ? t("Logged in", "লগড ইন") : t("Guest", "গেস্ট")}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* contact + cart */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t("Contact", "কন্টাক্ট")}</div>
              <div className="text-sm flex items-center gap-2 text-slate-800"><Mail className="w-3.5 h-3.5 text-slate-400" />{row.email}</div>
              {row.phone && <div className="text-sm flex items-center gap-2 mt-1.5 text-slate-800"><Phone className="w-3.5 h-3.5 text-slate-400" />{row.phone}</div>}
              {row.sender_number && <div className="text-xs text-slate-500 mt-1.5">{t("Sender", "পেমেন্ট নম্বর")}: <span className="font-semibold text-slate-700">{row.sender_number}</span></div>}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Total", "মোট")}</div>
                <div className="text-lg font-extrabold text-indigo-700">{fmtMoney(Number(row.total))}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("When", "কখন")}</div>
                <div className="text-xs text-slate-700">{new Date(row.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {row.coupon_code && (
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Coupon", "কুপন")}</div>
                  <span className="inline-block font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">{row.coupon_code}</span>
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Checkout Step", "চেকআউট ধাপ")}</div>
                <div className="text-xs font-semibold text-slate-700">{row.checkout_step || 1}/2</div>
              </div>
              {row.payment_method && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Payment", "পেমেন্ট")}</div>
                  <div className="text-xs font-semibold text-slate-700 capitalize">{row.payment_method}</div>
                </div>
              )}
              {row.transaction_id && (
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction ID</div>
                  <span className="inline-block font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">{row.transaction_id}</span>
                </div>
              )}
              {row.customer_note && (
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Customer Note", "কাস্টমার নোট")}</div>
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5">{row.customer_note}</div>
                </div>
              )}
            </div>
          </div>

          {/* items */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t("Items", "আইটেম")} ({(row.items ?? []).length})</div>
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {(row.items ?? []).map((it, i) => (
                <div key={i} className="p-3 flex items-center justify-between bg-white">
                  <div className="text-sm min-w-0">
                    <span className="font-medium text-slate-900">{it.emoji ? `${it.emoji} ` : ""}{it.name}</span>
                    {it.planPeriod && <span className="text-xs text-slate-500 ml-1">({it.planPeriod})</span>}
                    <span className="text-xs text-slate-400 ml-1.5">×{it.qty ?? 1}</span>
                  </div>
                  <div className="text-sm font-bold text-indigo-700 shrink-0">{fmtMoney(Number(it.price) * (it.qty ?? 1))}</div>
                </div>
              ))}
              {(row.items ?? []).length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">—</div>
              )}
            </div>
          </div>

          {/* status change */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{t("Change Status", "স্ট্যাটাস পরিবর্তন")}</label>
            <select
              value={row.status}
              onChange={(e) => onUpdate({ status: e.target.value as Row["status"] })}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white capitalize focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none"
            >
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="recovered">Recovered</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdate({ status: "contacted", contacted_at: new Date().toISOString() })}
              className="h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition inline-flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Send className="w-4 h-4" /> {t("Mark Contacted", "কন্টাক্ট করা হয়েছে")}
            </button>
            <a
              href={waLink || "#"}
              target={waLink ? "_blank" : undefined}
              rel="noreferrer"
              className={`h-10 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold transition ${
                waLink
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              onClick={(e) => { if (!waLink) e.preventDefault(); }}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>

          {/* admin note */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{t("Admin Note", "অ্যাডমিন নোট")}</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none resize-none bg-slate-50"
              placeholder={t("Internal notes…", "ইন্টারনাল নোট...")}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => onUpdate({ admin_note: note })}
                className="px-4 h-9 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                {t("Save Note", "নোট সেভ")}
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onDelete}
            className="w-full h-10 rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> {t("Delete this checkout", "এই চেকআউট ডিলিট")}
          </button>
        </div>
      </div>
    </div>
  );
}
