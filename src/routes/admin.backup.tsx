import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download, Upload, RefreshCw, Database, Archive, AlertTriangle,
  Package, FolderTree, ShoppingBag, ShoppingCart, Users, Ticket,
  KeyRound, BookOpen, LifeBuoy, Settings as SettingsIcon, Bell, Star,
  Activity, ShieldCheck, FileText, History, Trash2, Loader2, CheckCircle2,
  Sparkles,
} from "lucide-react";
import { createBackup, restoreBackup, BACKUP_TABLES, type BackupPayload } from "@/lib/backup.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/backup")({
  component: BackupPage,
});

type Tone = "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan" | "fuchsia" | "indigo" | "teal" | "orange" | "slate";

const TONE: Record<Tone, { bg: string; ic: string; ring: string }> = {
  violet:  { bg: "bg-violet-100",  ic: "text-violet-700",  ring: "ring-violet-200" },
  blue:    { bg: "bg-blue-100",    ic: "text-blue-700",    ring: "ring-blue-200" },
  emerald: { bg: "bg-emerald-100", ic: "text-emerald-700", ring: "ring-emerald-200" },
  amber:   { bg: "bg-amber-100",   ic: "text-amber-800",   ring: "ring-amber-200" },
  rose:    { bg: "bg-rose-100",    ic: "text-rose-700",    ring: "ring-rose-200" },
  cyan:    { bg: "bg-cyan-100",    ic: "text-cyan-700",    ring: "ring-cyan-200" },
  fuchsia: { bg: "bg-fuchsia-100", ic: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  indigo:  { bg: "bg-indigo-100",  ic: "text-indigo-700",  ring: "ring-indigo-200" },
  teal:    { bg: "bg-teal-100",    ic: "text-teal-700",    ring: "ring-teal-200" },
  orange:  { bg: "bg-orange-100",  ic: "text-orange-700",  ring: "ring-orange-200" },
  slate:   { bg: "bg-slate-100",   ic: "text-slate-700",   ring: "ring-slate-200" },
};

type TableMeta = { key: string; label: string; file: string; icon: React.ReactNode; tone: Tone };

const TABLE_META: TableMeta[] = [
  { key: "products",              label: "Products",         file: "products.json",         icon: <Package className="w-5 h-5" />,    tone: "violet" },
  { key: "admin_records",         label: "Site Settings",    file: "site_settings.json",    icon: <SettingsIcon className="w-5 h-5" />, tone: "slate" },
  { key: "orders",                label: "Orders",           file: "orders.json",           icon: <ShoppingBag className="w-5 h-5" />, tone: "amber" },
  { key: "profiles",              label: "Customers",        file: "customers.json",        icon: <Users className="w-5 h-5" />,      tone: "cyan" },
  { key: "coupons",               label: "Coupons",          file: "coupons.json",          icon: <Ticket className="w-5 h-5" />,     tone: "rose" },
  { key: "promotions",            label: "Promotions",       file: "promotions.json",       icon: <Sparkles className="w-5 h-5" />,   tone: "fuchsia" },
  { key: "product_reviews",       label: "Reviews",          file: "reviews.json",          icon: <Star className="w-5 h-5" />,       tone: "orange" },
  { key: "support_tickets",       label: "Support Tickets",  file: "support_tickets.json",  icon: <LifeBuoy className="w-5 h-5" />,   tone: "emerald" },
  { key: "notifications",         label: "Notifications",    file: "notifications.json",    icon: <Bell className="w-5 h-5" />,       tone: "rose" },
  { key: "team_members",          label: "Team Members",     file: "team_members.json",     icon: <Users className="w-5 h-5" />,      tone: "indigo" },
  { key: "user_roles",            label: "User Roles",       file: "user_roles.json",       icon: <ShieldCheck className="w-5 h-5" />, tone: "violet" },
  { key: "activity_logs",         label: "Activity Logs",    file: "activity_logs.json",    icon: <Activity className="w-5 h-5" />,   tone: "teal" },
  { key: "accessibility_reports", label: "A11y Reports",     file: "a11y_reports.json",     icon: <FileText className="w-5 h-5" />,   tone: "blue" },
];

const BN = (n: number) => n.toLocaleString("bn-BD");

type HistoryRow = {
  id: string;
  created_at: string;
  data: {
    created_at?: string;
    total_rows?: number;
    counts?: Record<string, number>;
    kind_label?: string;
  };
};

function BackupPage() {
  const runBackup = useServerFn(createBackup);
  const runRestore = useServerFn(restoreBackup);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [lastSnapshot, setLastSnapshot] = useState<BackupPayload | null>(null);
  const [busy, setBusy] = useState<null | "full" | "zip" | "restore" | "table">(null);
  const [busyTable, setBusyTable] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const refreshSnapshot = async (silent = false) => {
    if (!silent) setLoadingCounts(true);
    try {
      const r = await runBackup();
      const parsed = JSON.parse(r.json) as BackupPayload;
      setLastSnapshot(parsed);
      setCounts(r.meta.counts || {});
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoadingCounts(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("admin_records")
      .select("id, created_at, data")
      .eq("kind", "backup_history")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as unknown as HistoryRow[]);
  };

  useEffect(() => { refreshSnapshot(); loadHistory(); }, []);

  const totalRecords = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );
  const tableCount = Object.keys(BACKUP_TABLES).length;
  const lastBackupAt = history[0]?.data?.created_at ?? history[0]?.created_at ?? null;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const recordHistory = async (label: string, total: number, c: Record<string, number>) => {
    await supabase.from("admin_records").insert({
      kind: "backup_history",
      data: { created_at: new Date().toISOString(), total_rows: total, counts: c, kind_label: label } as never,
      is_active: true,
    });
    loadHistory();
  };

  const fullDbBackup = async () => {
    setBusy("full");
    try {
      const r = await runBackup();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(new Blob([r.json], { type: "application/json" }), `full-db-backup-${stamp}.json`);
      await recordHistory("Full DB Backup (JSON)", r.meta.total_rows, r.meta.counts);
      toast.success(`Full DB ব্যাকআপ সম্পন্ন (${BN(r.meta.total_rows)} সারি)`);
      setLastSnapshot(JSON.parse(r.json));
      setCounts(r.meta.counts);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup failed"); }
    finally { setBusy(null); }
  };

  const completeWebsiteBackup = async () => {
    setBusy("zip");
    try {
      const r = await runBackup();
      const manifest = {
        version: 1,
        created_at: new Date().toISOString(),
        type: "complete-website-backup",
        includes: {
          tables: Object.keys(r.meta.counts),
          storage_buckets: ["admin-uploads", "payment-screenshots"],
          notes: "Storage bucket files are referenced by URL inside JSON tables. Re-link CDN after restore.",
        },
        meta: r.meta,
      };
      const JSZipMod = await import("jszip").catch(() => null);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      if (JSZipMod && JSZipMod.default) {
        const zip = new JSZipMod.default();
        const parsed = JSON.parse(r.json) as BackupPayload;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("database.json", r.json);
        const tablesFolder = zip.folder("tables");
        for (const tm of TABLE_META) {
          const rows = parsed.tables[tm.key] ?? [];
          tablesFolder?.file(tm.file, JSON.stringify(rows, null, 2));
        }
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `complete-website-backup-${stamp}.zip`);
      } else {
        downloadBlob(new Blob([r.json], { type: "application/json" }), `complete-website-backup-${stamp}.json`);
        toast.info("ZIP লাইব্রেরি অনুপস্থিত — JSON ডাউনলোড করা হয়েছে");
      }
      await recordHistory("Complete Website Backup (ZIP)", r.meta.total_rows, r.meta.counts);
      toast.success(`কমপ্লিট ব্যাকআপ সম্পন্ন (${BN(r.meta.total_rows)} সারি)`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup failed"); }
    finally { setBusy(null); }
  };

  const downloadTable = async (tm: TableMeta) => {
    setBusy("table"); setBusyTable(tm.key);
    try {
      let snap = lastSnapshot;
      if (!snap) {
        const r = await runBackup();
        snap = JSON.parse(r.json) as BackupPayload;
        setLastSnapshot(snap); setCounts(r.meta.counts);
      }
      const rows = snap.tables[tm.key] ?? [];
      downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), tm.file);
      toast.success(`${tm.label}: ${BN(rows.length)} সারি ডাউনলোড`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); setBusyTable(null); }
  };

  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!confirm(`Restore "${file.name}"?\nMode: ${mode.toUpperCase()}\n${mode === "replace" ? "⚠️ Existing data will be DELETED before insert." : "Rows will be upserted by primary key."}`)) return;
    setBusy("restore");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.tables) throw new Error("Invalid backup file (missing tables)");
      const res = await runRestore({ data: { payloadJson: text, mode } });
      const total = Object.values(res.results).reduce((a, b) => a + (b.restored || 0), 0);
      const errs = Object.entries(res.results).filter(([, v]) => v.error);
      if (errs.length) toast.warning(`আংশিক সফল: ${BN(total)} সারি। ত্রুটি: ${errs.length}টি টেবিল`);
      else toast.success(`পুনরুদ্ধার সফল — ${BN(total)} সারি`);
      refreshSnapshot(true); loadHistory();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Restore failed"); }
    finally { setBusy(null); }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm("ইতিহাস থেকে এই এন্ট্রি মুছবেন?")) return;
    const { error } = await supabase.from("admin_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadHistory();
  };

  return (
    <div className="space-y-5">
      {/* Top action bar (overlapping the AdminPageHeader area) */}
      <div className="flex flex-wrap items-center justify-between gap-3 -mt-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Backup &amp; Restore</h2>
          <p className="text-sm text-slate-600 mt-0.5">ডেটা ব্যাকআপ, JSON এক্সপোর্ট এবং রিস্টোর সিস্টেম</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refreshSnapshot()}
            disabled={loadingCounts}
            className="h-10 px-4 rounded-full bg-white border border-slate-200 hover:border-violet-300 text-slate-700 text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition"
          >
            {loadingCounts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            রিফ্রেশ
          </button>
          <button
            onClick={fullDbBackup}
            disabled={busy !== null}
            className="h-10 px-4 rounded-full bg-white border border-slate-200 hover:border-violet-300 text-slate-800 text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition disabled:opacity-60"
          >
            {busy === "full" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Full DB Backup
          </button>
          <button
            onClick={completeWebsiteBackup}
            disabled={busy !== null}
            className="h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center gap-2 shadow disabled:opacity-60"
          >
            {busy === "zip" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Complete Website Backup
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="violet"  icon={<Database className="w-4 h-4" />}  label="মোট রেকর্ড"     value={BN(totalRecords)} />
        <StatCard tone="blue"    icon={<FolderTree className="w-4 h-4" />} label="টেবিল"          value={BN(tableCount)} />
        <StatCard tone="amber"   icon={<History className="w-4 h-4" />}    label="ব্যাকআপ হিস্ট্রি" value={BN(history.length)} />
        <StatCard tone="emerald" icon={<CheckCircle2 className="w-4 h-4" />} label="সর্বশেষ ব্যাকআপ" value={lastBackupAt ? new Date(lastBackupAt).toLocaleDateString("bn-BD") : "—"} />
      </div>

      {/* Quick Export / Import */}
      <div className="grid md:grid-cols-2 gap-3">
        <button
          onClick={fullDbBackup}
          disabled={busy !== null}
          className="group h-14 px-5 rounded-2xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-md text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
        >
          {busy === "full" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-violet-600" />}
          ব্যাকআপ / Export
        </button>
        <div className="relative">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onRestoreFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="w-full h-14 px-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {busy === "restore" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-600" />}
            রিস্টোর / Import
          </button>
          <div className="absolute -top-2 right-3 inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-[10px] font-bold shadow-sm">
            {(["merge", "replace"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-2 h-5 rounded-full transition ${mode === m ? "bg-slate-900 text-white" : "text-slate-600"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* All-in-one hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-100 via-fuchsia-100 to-indigo-100 p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span className="shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm ring-1 ring-violet-200 grid place-items-center text-violet-700">
              <Archive className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">এক ক্লিকে সম্পূর্ণ ব্যাকআপ</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-violet-600 text-white">ALL-IN-ONE</span>
              </div>
              <p className="text-sm text-slate-700 mt-1 leading-snug">
                সকল <b>{BN(tableCount)}টি টেবিল</b> + সকল ছবি/ফাইল রেফারেন্স (storage buckets) + manifest একটিমাত্র ZIP ফাইলে।
                যেকোনো সময় restore করা যাবে।
              </p>
            </div>
          </div>
          <button
            onClick={completeWebsiteBackup}
            disabled={busy !== null}
            className="shrink-0 h-12 px-6 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-violet-300/40 disabled:opacity-60"
          >
            {busy === "zip" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            এখনই ব্যাকআপ নিন
          </button>
        </div>
      </div>

      {/* Info strip */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p>
          নিচের প্রতিটি কার্ড থেকে আলাদা টেবিলের JSON ডাউনলোড করুন, অথবা উপরে থাকা
          <b> "এখনই ব্যাকআপ নিন"</b> বটন চাপলে সম্পূর্ণ ডেটাবেস + সকল ছবি/ফাইল ZIP আকারে এক ক্লিকে download হবে।
        </p>
      </div>

      {/* Table cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {TABLE_META.map((tm) => {
          const c = counts[tm.key];
          const t = TONE[tm.tone];
          const isBusy = busy === "table" && busyTable === tm.key;
          return (
            <div key={tm.key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition flex flex-col">
              <div className="flex items-start justify-between">
                <span className={`w-9 h-9 rounded-xl grid place-items-center ring-1 ${t.bg} ${t.ic} ${t.ring}`}>
                  {tm.icon}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                  {loadingCounts ? "…" : `${BN(c ?? 0)} rows`}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-slate-900 text-sm">{tm.label}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tm.file}</p>
              </div>
              <button
                onClick={() => downloadTable(tm)}
                disabled={busy !== null}
                className="mt-3 w-full h-9 rounded-full bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                ডাউনলোড
              </button>
            </div>
          );
        })}
      </div>

      {/* History */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900">ব্যাকআপ হিস্ট্রি</h3>
            <span className="text-[11px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{BN(history.length)}</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm("সব হিস্ট্রি মুছবেন?")) return;
                const ids = history.map(h => h.id);
                await supabase.from("admin_records").delete().in("id", ids);
                loadHistory();
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> সব মুছুন
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            এখনো কোনো ব্যাকআপ হিস্ট্রি নেই।
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((h) => {
              const when = new Date(h.data?.created_at ?? h.created_at);
              return (
                <li key={h.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center ring-1 ring-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {h.data?.kind_label ?? "Backup"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {when.toLocaleString("bn-BD")} · {BN(h.data?.total_rows ?? 0)} রেকর্ড
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHistory(h.id)}
                    className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> মুছুন
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ tone, icon, label, value }: { tone: Tone; icon: React.ReactNode; label: string; value: string }) {
  const t = TONE[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className={`w-6 h-6 rounded-lg grid place-items-center ring-1 ${t.bg} ${t.ic} ${t.ring}`}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{value}</p>
    </div>
  );
}
