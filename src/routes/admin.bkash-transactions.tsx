import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Wallet, Download, RefreshCw, Search, Filter, Eye, X, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Phone, Hash,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bkash-transactions")({
  component: BkashTransactionsPage,
});

type TxData = {
  trx_id?: string;
  customer?: string;
  phone?: string;
  payer_number?: string;
  amount?: number;
  type?: string;
  status?: "initiated" | "completed" | "success" | "pending" | "failed" | "cancelled";
  mode?: "live" | "sandbox";
  order_ref?: string;
  email?: string;
  payment_id?: string;
  note?: string;
};

type TxRow = {
  id: string;
  kind: string;
  data: TxData;
  is_active: boolean;
  created_at: string;
};

const fmt = (n: number | undefined) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");

const STATUS_META: Record<string, { label: string; bg: string; text: string; ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: CheckCircle2 },
  success:   { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: CheckCircle2 },
  initiated: { label: "Initiated", bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   icon: Clock },
  pending:   { label: "Pending",   bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   icon: Clock },
  failed:    { label: "Failed",    bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200",    icon: XCircle },
  cancelled: { label: "Cancelled", bg: "bg-slate-100",  text: "text-slate-600",   ring: "ring-slate-200",   icon: AlertTriangle },
};

function statusOf(s?: string): keyof typeof STATUS_META {
  const k = (s || "initiated").toLowerCase();
  return (STATUS_META[k] ? k : "initiated") as keyof typeof STATUS_META;
}

function BkashTransactionsPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<TxRow | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const { data, error } = await supabase
      .from("admin_records")
      .select("*")
      .eq("kind", "bkash_transaction")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as unknown) as TxRow[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let total = 0, completed = 0, failed = 0, revenue = 0;
    rows.forEach((r) => {
      total++;
      const s = statusOf(r.data?.status);
      if (s === "completed" || s === "success") { completed++; revenue += Number(r.data?.amount ?? 0); }
      else if (s === "failed") failed++;
    });
    return { total, completed, failed, revenue };
  }, [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = r.data ?? {};
      const s = statusOf(d.status);
      const m = (d.mode || "live").toLowerCase();
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (modeFilter !== "all" && m !== modeFilter) return false;
      if (!term) return true;
      const blob = [
        d.trx_id, d.payment_id, d.order_ref, d.customer, d.email, d.phone, d.payer_number,
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(term);
    });
  }, [rows, q, statusFilter, modeFilter]);

  const exportCsv = () => {
    if (!visible.length) return toast.error(t("Nothing to export", "এক্সপোর্ট করার কিছু নেই"));
    const headers = ["Date", "Order", "Customer", "Phone", "Payer Number", "TrxID", "Payment ID", "Amount", "Status", "Mode"];
    const lines = [headers.join(",")];
    visible.forEach((r) => {
      const d = r.data ?? {};
      const cells = [
        new Date(r.created_at).toISOString(),
        d.order_ref ?? "", d.customer ?? "", d.phone ?? "", d.payer_number ?? "",
        d.trx_id ?? "", d.payment_id ?? "", d.amount ?? "", d.status ?? "", d.mode ?? "live",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bkash-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("CSV exported", "CSV এক্সপোর্ট হয়েছে"));
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white shadow">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{t("bKash Transactions", "বিকাশ ট্রানজেকশন")}</h2>
            <p className="text-xs text-slate-500">{t("Complete history of every bKash Online payment (initiated, completed, failed).", "প্রতিটি বিকাশ অনলাইন পেমেন্টের সম্পূর্ণ ইতিহাস।")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> {t("Export CSV", "CSV এক্সপোর্ট")}
          </button>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("Total", "মোট")} value={String(stats.total)} tone="slate" />
        <StatCard label={t("Completed", "সম্পন্ন")} value={String(stats.completed)} tone="emerald" />
        <StatCard label={t("Failed", "ব্যর্থ")} value={String(stats.failed)} tone="rose" />
        <StatCard label={t("Revenue (৳)", "রেভিনিউ (৳)")} value={fmt(stats.revenue).replace("৳", "")} tone="violet" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by TrxID, Payment ID, order #, name, email, phone, payer number…", "TrxID, Payment ID, অর্ডার, নাম, ইমেইল, ফোন দিয়ে খুঁজুন…")}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-violet-300 text-sm text-slate-900 outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 px-1"><Filter className="w-4 h-4" /></div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-slate-50 border border-transparent text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-violet-300"
        >
          <option value="all">{t("All Statuses", "সব স্ট্যাটাস")}</option>
          <option value="completed">{t("Completed", "সম্পন্ন")}</option>
          <option value="initiated">{t("Initiated", "ইনিশিয়েটেড")}</option>
          <option value="failed">{t("Failed", "ব্যর্থ")}</option>
          <option value="cancelled">{t("Cancelled", "বাতিল")}</option>
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-slate-50 border border-transparent text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-violet-300"
        >
          <option value="all">{t("All Modes", "সব মোড")}</option>
          <option value="live">Live</option>
          <option value="sandbox">Sandbox</option>
        </select>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t("Payment History", "পেমেন্ট ইতিহাস")}</h3>
            <p className="text-[11px] text-slate-500">{visible.length} of {rows.length} {t("transactions", "ট্রানজেকশন")}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {rows.length === 0 ? t("No transactions yet.", "এখনো কোনো ট্রানজেকশন নেই।") : t("No matches.", "কিছু মেলেনি।")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <Th>{t("Date", "তারিখ")}</Th>
                  <Th>{t("Order", "অর্ডার")}</Th>
                  <Th>{t("Customer", "কাস্টমার")}</Th>
                  <Th>{t("Payer Number", "পেয়ার নম্বর")}</Th>
                  <Th>TrxID</Th>
                  <Th className="text-right">{t("Amount", "অ্যামাউন্ট")}</Th>
                  <Th>{t("Status", "স্ট্যাটাস")}</Th>
                  <Th>{t("Mode", "মোড")}</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const d = r.data ?? {};
                  const s = statusOf(d.status);
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  const mode = (d.mode || "live").toLowerCase();
                  const dt = new Date(r.created_at);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="text-slate-900 font-semibold text-[13px]">{dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div className="text-[11px] text-slate-500">{dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {d.order_ref ? <span className="font-mono text-[12px] text-slate-700">{d.order_ref}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {d.customer ? (
                          <>
                            <div className="font-semibold text-slate-900">{d.customer}</div>
                            {d.phone && <div className="text-[11px] text-slate-500 font-mono">{d.phone}</div>}
                          </>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {d.payer_number ? (
                          <span className="inline-flex items-center gap-1 text-pink-600 font-mono text-[12px]">
                            <Phone className="w-3 h-3" /> {d.payer_number}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {d.trx_id ? <span className="font-mono text-[12px] text-slate-700">{d.trx_id}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle text-right font-semibold text-slate-900">{fmt(d.amount)}</td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          mode === "live" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-700"
                        }`}>{mode}</span>
                      </td>
                      <td className="px-2 py-3 align-middle text-right">
                        <button onClick={() => setViewing(r)} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50" title={t("View details", "বিস্তারিত")}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && <DetailDrawer row={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/* ============================== Building blocks ============================== */

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 font-bold ${className ?? ""}`}>{children}</th>;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "emerald" | "rose" | "violet" }) {
  const toneClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    violet: "text-violet-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}

function DetailDrawer({ row, onClose }: { row: TxRow; onClose: () => void }) {
  const d = row.data ?? {};
  const s = statusOf(d.status);
  const meta = STATUS_META[s];
  const Icon = meta.icon;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-fuchsia-50 to-violet-50">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-fuchsia-600" />
            <h2 className="text-base font-extrabold text-slate-900">Transaction details</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
              <Icon className="w-3 h-3" /> {meta.label}
            </span>
            <span className="text-xl font-extrabold text-slate-900">{fmt(d.amount)}</span>
          </div>
          <Row label="Date" value={new Date(row.created_at).toLocaleString()} />
          <Row label="TrxID" value={d.trx_id} mono />
          <Row label="Payment ID" value={d.payment_id} mono />
          <Row label="Order Ref" value={d.order_ref} mono />
          <Row label="Customer" value={d.customer} />
          <Row label="Phone" value={d.phone} mono />
          <Row label="Payer Number" value={d.payer_number} mono />
          <Row label="Email" value={d.email} />
          <Row label="Mode" value={d.mode ?? "live"} />
          {d.note && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note</div>
              <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">{d.note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-slate-900 text-right ${mono ? "font-mono text-[12px]" : "font-semibold"}`}>
        {value ?? <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}
