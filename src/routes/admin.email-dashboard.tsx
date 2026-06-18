import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  AlertCircle,
  Clock,
  ShieldOff,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/email-dashboard")({
  component: EmailDashboardPage,
  head: () => ({
    meta: [
      { title: "Email Dashboard — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Row = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
};

type RangeKey = "24h" | "7d" | "30d" | "90d";
const RANGE_HOURS: Record<RangeKey, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, "90d": 24 * 90 };
const PAGE_SIZE = 50;

function EmailDashboardPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("7d");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGE_HOURS[range] * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("email_send_log")
      .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Dedupe by message_id → keep latest row per message
  const latest = useMemo(() => {
    const map = new Map<string, Row>();
    for (const r of rows) {
      const key = r.message_id || r.id;
      const prev = map.get(key);
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) map.set(key, r);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [rows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    for (const r of latest) if (r.template_name) set.add(r.template_name);
    return Array.from(set).sort();
  }, [latest]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return latest.filter((r) => {
      if (template !== "all" && r.template_name !== template) return false;
      if (status !== "all") {
        if (status === "failed" && !(r.status === "dlq" || r.status === "failed" || r.status === "bounced" || r.status === "complained")) return false;
        if (status === "sent" && r.status !== "sent") return false;
        if (status === "pending" && r.status !== "pending") return false;
        if (status === "suppressed" && r.status !== "suppressed") return false;
      }
      if (q && !(r.recipient_email ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [latest, template, status, query]);

  const counts = useMemo(() => {
    const c = { total: 0, sent: 0, failed: 0, pending: 0, suppressed: 0 };
    for (const r of filtered) {
      c.total++;
      const s = r.status ?? "";
      if (s === "sent") c.sent++;
      else if (s === "pending") c.pending++;
      else if (s === "suppressed") c.suppressed++;
      else c.failed++;
    }
    return c;
  }, [filtered]);

  const perTemplate = useMemo(() => {
    const map = new Map<string, { total: number; sent: number; failed: number; pending: number; last: string | null; lastError: string | null }>();
    for (const r of filtered) {
      const name = r.template_name ?? "—";
      const cur = map.get(name) ?? { total: 0, sent: 0, failed: 0, pending: 0, last: null, lastError: null };
      cur.total++;
      const s = r.status ?? "";
      if (s === "sent") cur.sent++;
      else if (s === "pending") cur.pending++;
      else if (s === "suppressed") { /* counted elsewhere */ }
      else cur.failed++;
      if (s === "sent" && (!cur.last || new Date(r.created_at) > new Date(cur.last))) cur.last = r.created_at;
      if (s !== "sent" && r.error_message && !cur.lastError) cur.lastError = r.error_message;
      map.set(name, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-600" />
            {t("Email Dashboard", "ইমেইল ড্যাশবোর্ড")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Track every transactional email — sends, failures, and delivery stats.",
              "প্রতিটি ট্রানজ্যাকশনাল ইমেইল ট্র্যাক করুন — পাঠানো, ব্যর্থতা ও ডেলিভারি স্ট্যাট।",
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("Refresh", "রিফ্রেশ")}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            {t("Time Range", "টাইম রেঞ্জ")}
          </div>
          <div className="flex gap-1.5 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
            {(Object.keys(RANGE_HOURS) as RangeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`flex-1 h-9 rounded-full text-xs font-bold transition ${
                  range === k
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            {t("Template", "টেমপ্লেট")}
          </div>
          <select
            value={template}
            onChange={(e) => { setTemplate(e.target.value); setPage(1); }}
            className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
          >
            <option value="all">{t("All Templates", "সব টেমপ্লেট")}</option>
            {templates.map((t2) => (
              <option key={t2} value={t2}>{t2}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            {t("Status", "স্ট্যাটাস")}
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
          >
            <option value="all">{t("All Statuses", "সব স্ট্যাটাস")}</option>
            <option value="sent">{t("Sent", "পাঠানো")}</option>
            <option value="failed">{t("Failed", "ব্যর্থ")}</option>
            <option value="pending">{t("Pending", "পেন্ডিং")}</option>
            <option value="suppressed">{t("Suppressed", "সাপ্রেসড")}</option>
          </select>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            {t("Search Recipient", "রিসিপিয়েন্ট খুঁজুন")}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="email@example.com"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Mail className="w-4 h-4 text-violet-600" />} ring="ring-violet-200" value={counts.total} label={t("Total", "মোট")} valueClass="text-slate-900" />
        <StatCard icon={<Send className="w-4 h-4 text-emerald-600" />} ring="ring-emerald-200" value={counts.sent} label={t("Sent", "পাঠানো")} valueClass="text-slate-900" />
        <StatCard icon={<AlertCircle className="w-4 h-4 text-rose-600" />} ring="ring-rose-200" value={counts.failed} label={t("Failed", "ব্যর্থ")} valueClass="text-rose-600" />
        <StatCard icon={<Clock className="w-4 h-4 text-amber-600" />} ring="ring-amber-200" value={counts.pending} label={t("Pending", "পেন্ডিং")} valueClass="text-amber-600" />
        <StatCard icon={<ShieldOff className="w-4 h-4 text-slate-600" />} ring="ring-slate-200" value={counts.suppressed} label={t("Suppressed", "সাপ্রেসড")} valueClass="text-slate-900" />
      </div>

      {/* Per-template summary */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-l-4 border-violet-500">
          <h3 className="text-base font-extrabold text-slate-900">
            {t("Per-Template Summary", "প্রতি টেমপ্লেট সামারি")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <Th>{t("Template", "টেমপ্লেট")}</Th>
                <Th className="text-center">{t("Total", "মোট")}</Th>
                <Th className="text-center">{t("Sent", "পাঠানো")}</Th>
                <Th className="text-center">{t("Failed", "ব্যর্থ")}</Th>
                <Th className="text-center">{t("Pending", "পেন্ডিং")}</Th>
                <Th>{t("Last Sent", "শেষ পাঠানো")}</Th>
                <Th>{t("Last Error", "শেষ ত্রুটি")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perTemplate.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">{t("No data", "কোনো ডেটা নেই")}</td></tr>
              ) : perTemplate.map((p) => (
                <tr key={p.name} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-5 py-3.5 text-center text-slate-700">{p.total}</td>
                  <td className="px-5 py-3.5 text-center text-emerald-700 font-semibold">{p.sent}</td>
                  <td className={`px-5 py-3.5 text-center font-semibold ${p.failed > 0 ? "text-rose-600" : "text-slate-500"}`}>{p.failed}</td>
                  <td className="px-5 py-3.5 text-center text-slate-700">{p.pending}</td>
                  <td className="px-5 py-3.5 text-slate-600">{p.last ? fmt(p.last) : "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 truncate max-w-xs">{p.lastError ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">
            {t("Email Log", "ইমেইল লগ")} ({filtered.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              {t("Prev", "আগের")}
            </button>
            <span className="text-xs text-slate-500 font-semibold">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              {t("Next", "পরের")}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <Th>{t("Template", "টেমপ্লেট")}</Th>
                <Th>{t("Recipient", "রিসিপিয়েন্ট")}</Th>
                <Th>{t("Status", "স্ট্যাটাস")}</Th>
                <Th>{t("Timestamp", "সময়")}</Th>
                <Th>{t("Error", "ত্রুটি")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500">{t("No emails found", "কোনো ইমেইল পাওয়া যায়নি")}</td></tr>
              ) : pageRows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{r.template_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-slate-700">{r.recipient_email ?? "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3.5 text-slate-600">{fmt(r.created_at)}</td>
                  <td className="px-5 py-3.5 text-slate-500 truncate max-w-md">{r.error_message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 text-left font-bold ${className}`}>{children}</th>;
}

function StatCard({
  icon, ring, value, label, valueClass = "text-slate-900",
}: { icon: React.ReactNode; ring: string; value: number; label: string; valueClass?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-full bg-white grid place-items-center ring-1 ${ring}`}>{icon}</span>
        <div className="text-xs text-slate-500 font-semibold">{label}</div>
      </div>
      <div className={`text-2xl font-extrabold mt-2 ${valueClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "";
  if (s === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  }
  if (s === "suppressed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        <ShieldOff className="w-3 h-3" /> Suppressed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
      <XCircle className="w-3 h-3" /> {s || "Failed"}
    </span>
  );
}
