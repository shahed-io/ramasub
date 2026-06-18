import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Eye, Trash2, MessageCircle, RefreshCw, Search as SearchIcon,
  Mail, Phone, ArrowRight, FileText, Clock, Package, X,
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
  status: "pending" | "contacted" | "recovered" | "lost";
  contacted_at: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

const fmtMoney = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");

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
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("Total", "মোট")} value={counts.all} tone="slate" icon={<FileText className="w-4 h-4" />} loading={loading} />
        <StatCard label={t("Pending Recovery", "পেন্ডিং রিকভারি")} value={counts.pending} tone="amber" icon={<Clock className="w-4 h-4" />} loading={loading} highlight />
        <StatCard label={t("Recovered", "রিকভারড")} value={counts.recovered} tone="emerald" icon={<RefreshCw className="w-4 h-4" />} loading={loading} />
        <StatCard label={t("Lost Value", "লস্ট ভ্যালু")} value={fmtMoney(lostValue)} tone="rose" icon={<Package className="w-4 h-4" />} loading={loading} highlight />
      </div>

      {/* Search + tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] px-3 h-11 rounded-2xl bg-white border border-slate-200">
          <SearchIcon className="w-4 h-4 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by name, email, phone, coupon or product…", "নাম, ইমেইল, ফোন, কুপন বা প্রোডাক্ট...")}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
        </div>
        <Tab active={tab === "pending"} onClick={() => setTab("pending")} primary>{t("Pending", "পেন্ডিং")} ({counts.pending})</Tab>
        <Tab active={tab === "all"} onClick={() => setTab("all")}>{t("All", "সব")} ({counts.all})</Tab>
        <Tab active={tab === "recovered"} onClick={() => setTab("recovered")}>{t("Recovered", "রিকভারড")} ({counts.recovered})</Tab>
        <Tab active={tab === "contacted"} onClick={() => setTab("contacted")}>{t("Contacted", "কন্টাক্টেড")} ({counts.contacted})</Tab>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-semibold">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("Refresh", "রিফ্রেশ")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">{t("Customer", "কাস্টমার")}</th>
                  <th className="text-left px-3 py-3">{t("Contact", "কন্টাক্ট")}</th>
                  <th className="text-left px-3 py-3">{t("Items", "আইটেম")}</th>
                  <th className="text-left px-3 py-3">{t("Total", "মোট")}</th>
                  <th className="text-left px-3 py-3">{t("When", "কখন")}</th>
                  <th className="text-left px-3 py-3">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="text-right px-4 py-3">{t("Actions", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody>
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
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">{t("No abandoned checkouts.", "কোনো অ্যাবান্ডনড চেকআউট নেই।")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          row={selected}
          onClose={() => setSelected(null)}
          onUpdate={(p) => updateRow(selected.id, p)}
          onDelete={() => deleteRow(selected.id)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone, icon, loading, highlight }: { label: string; value: string | number; tone: "slate"|"amber"|"emerald"|"rose"; icon: React.ReactNode; loading?: boolean; highlight?: boolean }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-600 text-white",
    amber: "bg-amber-500 text-white",
    emerald: "bg-emerald-500 text-white",
    rose: "bg-rose-500 text-white",
  };
  return (
    <div className={`bg-white rounded-2xl p-4 border ${highlight ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <span className={`w-9 h-9 rounded-full grid place-items-center shadow-sm ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{loading ? "…" : value}</div>
    </div>
  );
}

function Tab({ active, onClick, children, primary }: { active: boolean; onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-11 rounded-xl text-sm font-semibold transition ${active ? (primary ? "bg-violet-600 text-white shadow-sm" : "bg-slate-900 text-white") : "text-slate-600 hover:text-slate-900 hover:bg-white"}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  const { t } = useAdminLang();
  const m: Record<Row["status"], { cls: string; en: string; bn: string }> = {
    pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", en: "Pending", bn: "পেন্ডিং" },
    contacted: { cls: "bg-sky-50 text-sky-700 border-sky-200", en: "Contacted", bn: "কন্টাক্টেড" },
    recovered: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", en: "Recovered", bn: "রিকভারড" },
    lost: { cls: "bg-rose-50 text-rose-700 border-rose-200", en: "Lost", bn: "লস্ট" },
  };
  const v = m[status];
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${v.cls}`}>{t(v.en, v.bn)}</span>;
}

function RowItem({ row: r, onView, onContact, onDelete }: { row: Row; onView: () => void; onContact: () => void; onDelete: () => void }) {
  const { t } = useAdminLang();
  const waLink = r.phone ? `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${r.full_name}, আপনি আমাদের ওয়েবসাইটে একটি অর্ডার শুরু করেছিলেন। কোনো সাহায্যের প্রয়োজন হলে জানান।`)}` : "";
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900">{r.full_name || "—"}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{r.user_id ? t("Logged in", "লগড ইন") : t("Guest", "গেস্ট")}</div>
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" />{r.email}</div>
        {r.phone && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3 text-slate-400" />{r.phone}</div>}
      </td>
      <td className="px-3 py-3 text-slate-700">{(r.items ?? []).reduce((a, it) => a + (it.qty ?? 1), 0)}</td>
      <td className="px-3 py-3 font-bold text-slate-900">{fmtMoney(Number(r.total))}</td>
      <td className="px-3 py-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <IconBtn title={t("View", "দেখুন")} onClick={onView}><Eye className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title={t("Mark contacted", "কন্টাক্ট করা হয়েছে")} onClick={onContact}><ArrowRight className="w-3.5 h-3.5" /></IconBtn>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp"
              className="w-7 h-7 grid place-items-center rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50">
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          <IconBtn title={t("Delete", "ডিলিট")} onClick={onDelete} danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      className={`w-7 h-7 grid place-items-center rounded-md ${danger ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50" : "text-slate-500 hover:text-violet-600 hover:bg-violet-50"}`}
    >
      {children}
    </button>
  );
}

function DetailModal({ row, onClose, onUpdate, onDelete }: { row: Row; onClose: () => void; onUpdate: (p: Partial<Row>) => void; onDelete: () => void }) {
  const { t } = useAdminLang();
  const [note, setNote] = useState(row.admin_note || "");
  const waLink = row.phone ? `https://wa.me/${row.phone.replace(/\D/g, "")}` : "";
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-extrabold text-lg text-slate-900">{row.full_name || t("Guest", "গেস্ট")}</h2>
            <StatusBadge status={row.status} />
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-700 mb-2">{t("Contact", "কন্টাক্ট")}</div>
              <div className="text-sm flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" />{row.email}</div>
              {row.phone && <div className="text-sm flex items-center gap-2 mt-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{row.phone}</div>}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-700 mb-2">{t("Cart", "কার্ট")}</div>
              <div className="text-sm flex items-center justify-between"><span className="text-slate-500">{t("Total", "মোট")}</span><span className="font-bold text-violet-700">{fmtMoney(Number(row.total))}</span></div>
              {row.coupon_code && <div className="text-xs text-slate-500 mt-1">{t("Coupon", "কুপন")}: <span className="font-mono font-semibold text-slate-700">{row.coupon_code}</span></div>}
              <div className="text-xs text-slate-500 mt-1">{t("When", "কখন")}: {new Date(row.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">{t("Items", "আইটেম")}</div>
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
              {(row.items ?? []).map((it, i) => (
                <div key={i} className="p-3 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">{it.emoji ? `${it.emoji} ` : ""}{it.name}</span>
                    {it.planPeriod && <span className="text-xs text-slate-500 ml-1">({it.planPeriod})</span>}
                    <span className="text-xs text-slate-400 ml-1.5">×{it.qty ?? 1}</span>
                  </div>
                  <div className="text-sm font-bold text-violet-700">{fmtMoney(Number(it.price) * (it.qty ?? 1))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a href={waLink || "#"} target={waLink ? "_blank" : undefined} rel="noreferrer"
               className={`h-10 rounded-xl border inline-flex items-center justify-center gap-2 text-sm font-semibold ${waLink ? "border-emerald-200 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50" : "border-slate-200 text-slate-400 cursor-not-allowed"}`}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button onClick={() => onUpdate({ status: "contacted", contacted_at: new Date().toISOString() })}
               className="h-10 rounded-xl border border-sky-200 text-sky-700 bg-sky-50/40 hover:bg-sky-50 inline-flex items-center justify-center gap-2 text-sm font-semibold">
              <ArrowRight className="w-4 h-4" /> {t("Mark Contacted", "কন্টাক্ট করা হয়েছে")}
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("Status", "স্ট্যাটাস")}</label>
            <select value={row.status} onChange={(e) => onUpdate({ status: e.target.value as Row["status"] })}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white capitalize focus:border-violet-400 outline-none">
              {["pending","contacted","recovered","lost"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("Admin Note", "অ্যাডমিন নোট")}</label>
            <div className="flex gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 outline-none resize-none"
                placeholder={t("Internal notes…", "ইন্টারনাল নোট...")} />
              <button onClick={() => onUpdate({ admin_note: note })}
                className="self-start px-4 h-10 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                {t("Save", "সেভ")}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button onClick={onDelete} className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> {t("Delete this entry", "এন্ট্রি ডিলিট করুন")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
