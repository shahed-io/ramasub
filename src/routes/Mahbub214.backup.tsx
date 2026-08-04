import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download, Upload, RefreshCw, Database, Archive, ShieldCheck, History,
  Trash2, Loader2, CheckCircle2, FolderTree, RotateCcw, FileJson, Package,
  AlertTriangle,
} from "lucide-react";
import {
  createBackup, restoreBackup, getBackupCounts, listBackupFiles, restoreBackupFile,
  BACKUP_TABLE_ORDER, BACKUP_TABLES, type BackupPayload,
} from "@/lib/backup.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/Mahbub214/backup")({
  component: BackupPage,
});

const BN = (n: number) => n.toLocaleString("bn-BD");

type HistoryRow = {
  id: string;
  created_at: string;
  data: { created_at?: string; total_rows?: number; kind_label?: string };
};

type Progress = { label: string; done: number; total: number } | null;

const PARALLEL = 6;

async function inParallel<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  onTick: (done: number) => void,
  limit = PARALLEL,
) {
  let index = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = index++;
      if (i >= items.length) return;
      try {
        await worker(items[i]);
      } catch (e) {
        console.error(e);
      }
      onTick(++done);
    }
  });
  await Promise.all(runners);
}

function BackupPage() {
  const runBackup = useServerFn(createBackup);
  const runRestore = useServerFn(restoreBackup);
  const runCounts = useServerFn(getBackupCounts);
  const runListFiles = useServerFn(listBackupFiles);
  const runUploadFile = useServerFn(restoreBackupFile);

  const [tab, setTab] = useState<"export" | "restore">("export");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [busy, setBusy] = useState<null | "full" | "zip" | "restore" | "table">(null);
  const [busyTable, setBusyTable] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [mode, setMode] = useState<"skip" | "merge" | "replace">("skip");

  const tableFileRef = useRef<HTMLInputElement>(null);
  const fullFileRef = useRef<HTMLInputElement>(null);
  const zipFileRef = useRef<HTMLInputElement>(null);

  const loadCounts = async (silent = false) => {
    if (!silent) setLoadingCounts(true);
    try {
      const r = await runCounts();
      setCounts(r.counts);
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

  useEffect(() => {
    loadCounts();
    loadHistory();
  }, []);

  const totalRecords = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );
  const tableCount = BACKUP_TABLE_ORDER.length;
  const lastBackupAt = history[0]?.data?.created_at ?? history[0]?.created_at ?? null;
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const recordHistory = async (label: string, total: number) => {
    await supabase.from("admin_records").insert({
      kind: "backup_history",
      data: { created_at: new Date().toISOString(), total_rows: total, kind_label: label } as never,
      is_active: true,
    });
    loadHistory();
  };

  /** Dump every table in parallel batches, reporting progress. */
  const dumpAllTables = async (): Promise<BackupPayload> => {
    const tables: Record<string, Array<Record<string, unknown>>> = {};
    const rowCounts: Record<string, number> = {};
    setProgress({ label: "টেবিল ডাউনলোড হচ্ছে", done: 0, total: tableCount });

    await inParallel(
      BACKUP_TABLE_ORDER,
      async (table) => {
        const r = await runBackup({ data: { tables: [table] } });
        const parsed = JSON.parse(r.json) as BackupPayload;
        tables[table] = parsed.tables[table] ?? [];
        rowCounts[table] = tables[table].length;
      },
      (done) => setProgress({ label: "টেবিল ডাউনলোড হচ্ছে", done, total: tableCount }),
    );

    setCounts(rowCounts);
    return {
      meta: {
        version: 1,
        created_at: new Date().toISOString(),
        total_rows: Object.values(rowCounts).reduce((a, b) => a + b, 0),
        counts: rowCounts,
      },
      tables,
    };
  };

  const fullDbBackup = async () => {
    setBusy("full");
    try {
      const payload = await dumpAllTables();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `ramasub_full_backup_${stamp}.json`,
      );
      await recordHistory("Full DB Backup (JSON)", payload.meta.total_rows);
      toast.success(`Full DB ব্যাকআপ সম্পন্ন (${BN(payload.meta.total_rows)} সারি)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  /** Database + every storage file, all fetched in parallel, into one ZIP. */
  const completeWebsiteBackup = async () => {
    setBusy("zip");
    try {
      const payload = await dumpAllTables();
      const JSZipMod = await import("jszip");
      const zip = new JSZipMod.default();
      zip.file("database.json", JSON.stringify(payload, null, 2));
      const tablesFolder = zip.folder("tables");
      for (const table of BACKUP_TABLE_ORDER) {
        tablesFolder?.file(`${table}.json`, JSON.stringify(payload.tables[table] ?? [], null, 2));
      }

      // storage files — parallel download
      const { files } = await runListFiles();
      let saved = 0;
      if (files.length) {
        setProgress({ label: "ছবি/ফাইল ডাউনলোড হচ্ছে", done: 0, total: files.length });
        const storageFolder = zip.folder("storage");
        await inParallel(
          files,
          async (f) => {
            if (!f.url) return;
            const res = await fetch(f.url);
            if (!res.ok) return;
            const buf = await res.arrayBuffer();
            storageFolder?.folder(f.bucket)?.file(f.path, buf);
            saved++;
          },
          (done) => setProgress({ label: "ছবি/ফাইল ডাউনলোড হচ্ছে", done, total: files.length }),
        );
      }

      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            version: 2,
            type: "complete-website-backup",
            created_at: new Date().toISOString(),
            tables: payload.meta.counts,
            total_rows: payload.meta.total_rows,
            storage_files: saved,
          },
          null,
          2,
        ),
      );

      setProgress({ label: "ZIP তৈরি হচ্ছে", done: 0, total: 1 });
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `ramasub_complete_backup_${stamp}.zip`);
      await recordHistory("Complete Website Backup (ZIP)", payload.meta.total_rows);
      toast.success(`কমপ্লিট ব্যাকআপ সম্পন্ন — ${BN(payload.meta.total_rows)} সারি + ${BN(saved)} ফাইল`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const downloadTable = async (table: string) => {
    setBusy("table");
    setBusyTable(table);
    try {
      const r = await runBackup({ data: { tables: [table] } });
      const parsed = JSON.parse(r.json) as BackupPayload;
      const rows = parsed.tables[table] ?? [];
      downloadBlob(
        new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
        `${table}.json`,
      );
      setCounts((c) => ({ ...c, [table]: rows.length }));
      toast.success(`${table}: ${BN(rows.length)} সারি ডাউনলোড`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
      setBusyTable(null);
    }
  };

  const applyRestore = async (payloadJson: string) => {
    const res = await runRestore({ data: { payloadJson, mode } });
    const total = Object.values(res.results).reduce((a, b) => a + (b.restored || 0), 0);
    const errs = Object.entries(res.results).filter(([, v]) => v.error);
    if (errs.length) {
      toast.warning(`আংশিক সফল: ${BN(total)} সারি। ত্রুটি: ${errs.length}টি টেবিল`);
      console.warn("restore errors", errs);
    } else {
      toast.success(`রিস্টোর সফল — ${BN(total)} সারি`);
    }
    return total;
  };

  /** One or more single-table JSON files (products.json, orders.json …). */
  const onTableFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy("restore");
    try {
      const tables: Record<string, Array<Record<string, unknown>>> = {};
      for (const f of files) {
        const table = f.name.replace(/\.json$/i, "");
        if (!BACKUP_TABLES[table]) {
          toast.warning(`${f.name} — অজানা টেবিল, বাদ দেওয়া হলো`);
          continue;
        }
        const parsed = JSON.parse(await f.text());
        const rows = Array.isArray(parsed) ? parsed : parsed?.tables?.[table];
        if (!Array.isArray(rows)) {
          toast.warning(`${f.name} — সঠিক ফরম্যাট নয়`);
          continue;
        }
        tables[table] = rows;
      }
      if (!Object.keys(tables).length) return;
      await applyRestore(JSON.stringify({ meta: { version: 1 }, tables }));
      loadCounts(true);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  /** A full backup JSON (all tables, parent → child order). */
  const onFullFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("restore");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.tables) throw new Error("Invalid backup file (tables অনুপস্থিত)");
      await applyRestore(text);
      loadCounts(true);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  /** Complete ZIP: database.json + storage/<bucket>/<path> files. */
  const onZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("restore");
    try {
      const JSZipMod = await import("jszip");
      const zip = await JSZipMod.default.loadAsync(file);
      const dbEntry = zip.file("database.json");
      if (dbEntry) {
        await applyRestore(await dbEntry.async("string"));
      } else {
        toast.warning("ZIP-এ database.json নেই — শুধু ফাইল রিস্টোর হবে");
      }

      const storageEntries = Object.values(zip.files).filter(
        (f) => !f.dir && f.name.startsWith("storage/"),
      );
      if (storageEntries.length) {
        setProgress({ label: "ছবি/ফাইল আপলোড হচ্ছে", done: 0, total: storageEntries.length });
        await inParallel(
          storageEntries,
          async (entry) => {
            const rest = entry.name.slice("storage/".length);
            const slash = rest.indexOf("/");
            if (slash < 1) return;
            const bucket = rest.slice(0, slash);
            const path = rest.slice(slash + 1);
            if (bucket !== "admin-uploads" && bucket !== "payment-screenshots") return;
            const base64 = await entry.async("base64");
            await runUploadFile({ data: { bucket, path, base64, overwrite: mode === "replace" } });
          },
          (done) => setProgress({ label: "ছবি/ফাইল আপলোড হচ্ছে", done, total: storageEntries.length }),
          3,
        );
        toast.success(`${BN(storageEntries.length)}টি ফাইল রিস্টোর হয়েছে`);
      }
      loadCounts(true);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ZIP restore failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm("ইতিহাস থেকে এই এন্ট্রি মুছবেন?")) return;
    const { error } = await supabase.from("admin_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadHistory();
  };

  return (
    <div className="space-y-5">
      {/* Title + top actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 -mt-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Backup &amp; Restore</h2>
          <p className="text-sm text-slate-600 mt-0.5">ডেটা ব্যাকআপ, JSON এক্সপোর্ট এবং রিস্টোর সিস্টেম</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadCounts()}
            disabled={loadingCounts || busy !== null}
            className="h-10 px-4 rounded-full bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition disabled:opacity-60"
          >
            {loadingCounts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            রিফ্রেশ
          </button>
          <button
            onClick={fullDbBackup}
            disabled={busy !== null}
            className="h-10 px-4 rounded-full bg-white border border-slate-200 hover:border-blue-300 text-slate-800 text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition disabled:opacity-60"
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

      {/* Live progress */}
      {progress && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              {progress.label}
            </span>
            <span className="text-blue-700">
              {BN(progress.done)}/{BN(progress.total)} · {BN(pct)}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Database className="w-4 h-4" />} label="মোট রেকর্ড" value={loadingCounts ? "…" : BN(totalRecords)} tone="violet" />
        <StatCard icon={<FolderTree className="w-4 h-4" />} label="টেবিল" value={BN(tableCount)} tone="blue" />
        <StatCard icon={<History className="w-4 h-4" />} label="ব্যাকআপ হিস্ট্রি" value={BN(history.length)} tone="amber" />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="সর্বশেষ ব্যাকআপ"
          value={lastBackupAt ? new Date(lastBackupAt).toLocaleDateString("bn-BD") : "—"}
          tone="violet"
        />
      </div>

      {/* Tabs */}
      <div className="grid md:grid-cols-2 gap-3">
        <button
          onClick={() => setTab("export")}
          className={`h-14 px-5 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 border transition ${
            tab === "export"
              ? "bg-blue-50 border-blue-300 text-blue-800 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:border-blue-200"
          }`}
        >
          <Download className="w-5 h-5" /> ব্যাকআপ / Export
        </button>
        <button
          onClick={() => setTab("restore")}
          className={`h-14 px-5 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 border transition ${
            tab === "restore"
              ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:border-amber-200"
          }`}
        >
          <RotateCcw className="w-5 h-5" /> রিস্টোর / Import
        </button>
      </div>

      {tab === "export" ? (
        <>
          {/* All-in-one hero */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-100 via-sky-100 to-indigo-100 p-5 sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-sky-300/30 blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <span className="shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm ring-1 ring-blue-200 grid place-items-center text-blue-700">
                  <Archive className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">এক ক্লিকে সম্পূর্ণ ব্যাকআপ</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-blue-600 text-white">PARALLEL</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1 leading-snug">
                    সকল <b>{BN(tableCount)}টি টেবিল</b> + <b>সকল ছবি/ফাইল</b> parallel-এ ডাউনলোড হয়। কিছুই বাদ যাবে না।
                    উপরে percentage দেখুন।
                  </p>
                </div>
              </div>
              <button
                onClick={completeWebsiteBackup}
                disabled={busy !== null}
                className="shrink-0 h-12 px-6 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-300/40 disabled:opacity-60"
              >
                {busy === "zip" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                এখনই ব্যাকআপ নিন
              </button>
            </div>
          </div>

          {/* Info strip */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p>
              নিচের প্রতিটি কার্ড থেকে আলাদা টেবিলের JSON ডাউনলোড করুন, অথবা উপরে থাকা
              <b> "এখনই ব্যাকআপ নিন"</b> বাটন চাপলে সম্পূর্ণ ডাটাবেস + সকল ছবি/ফাইল ZIP আকারে এক ক্লিকে download হবে।
            </p>
          </div>

          {/* Table cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {BACKUP_TABLE_ORDER.map((table) => {
              const isBusy = busy === "table" && busyTable === table;
              return (
                <div
                  key={table}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-9 h-9 rounded-xl grid place-items-center ring-1 bg-blue-100 text-blue-700 ring-blue-200 shrink-0">
                      <FileJson className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                      {loadingCounts ? "…" : `${BN(counts[table] ?? 0)} rows`}
                    </span>
                  </div>
                  <div className="mt-3 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{table}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{table}.json</p>
                  </div>
                  <button
                    onClick={() => downloadTable(table)}
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
        </>
      ) : (
        <>
          {/* Smart restore notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-white ring-1 ring-amber-200 grid place-items-center text-amber-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900 text-sm">🛡️ Smart Restore — Duplicate-Safe</p>
              <p>
                রিস্টোর করলে <b>শুধু নতুন রেকর্ড</b> যোগ হবে। যেসব product/coupon/category/blog আগে থেকেই আছে
                (একই slug, code, key বা id মিললে) সেগুলো <b>অপরিবর্তিত থাকবে</b> — overwrite হবে না। তাই double-import
                করলেও কিছু duplicate বা reset হবে না। parent টেবিল আগে restore হবে যাতে foreign key ভাঙে না।
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700">রিস্টোর মোড:</span>
            {([
              ["skip", "শুধু নতুন যোগ করুন (Safe)"],
              ["merge", "মিলিয়ে নিন (Overwrite)"],
              ["replace", "মুছে নতুন করে বসান (⚠️ Danger)"],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-9 px-4 rounded-full text-xs font-bold border transition ${
                  mode === m
                    ? m === "replace"
                      ? "bg-rose-600 border-rose-600 text-white"
                      : "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <DropCard
              icon={<RotateCcw className="w-4 h-4" />}
              title="একটি টেবিল রিস্টোর"
              subtitle="একক JSON ব্যাকআপ ফাইল আপলোড করুন"
              cta="JSON ফাইল আপলোড করুন (একাধিক নির্বাচন করা যাবে)"
              hint="products.json, orders.json … একসাথে সব সিলেক্ট করুন"
              disabled={busy !== null}
              busy={busy === "restore"}
              onClick={() => tableFileRef.current?.click()}
            />
            <DropCard
              icon={<Database className="w-4 h-4" />}
              title="Full Backup রিস্টোর"
              subtitle={`সব টেবিল একসাথে (parent → child order)`}
              cta="Full Backup JSON আপলোড"
              hint="ramasub_full_backup_XXXX.json"
              disabled={busy !== null}
              busy={busy === "restore"}
              onClick={() => fullFileRef.current?.click()}
            />
          </div>

          <DropCard
            wide
            icon={<Package className="w-4 h-4" />}
            title="Complete ZIP রিস্টোর"
            subtitle="Database + Storage (সব ছবি/ফাইল) — এক ক্লিকে"
            cta="Complete Backup ZIP আপলোড"
            hint="ramasub_complete_backup_XXXX.zip"
            disabled={busy !== null}
            busy={busy === "restore"}
            onClick={() => zipFileRef.current?.click()}
          />

          <input ref={tableFileRef} type="file" multiple accept="application/json,.json" className="hidden" onChange={onTableFiles} />
          <input ref={fullFileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFullFile} />
          <input ref={zipFileRef} type="file" accept=".zip,application/zip" className="hidden" onChange={onZipFile} />
        </>
      )}

      {/* History */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900">ব্যাকআপ হিস্ট্রি</h3>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {BN(history.length)}
            </span>
          </div>
          {history.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm("সব হিস্ট্রি মুছবেন?")) return;
                await supabase.from("admin_records").delete().in("id", history.map((h) => h.id));
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
                    <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 grid place-items-center ring-1 ring-blue-200">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{h.data?.kind_label ?? "Backup"}</p>
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

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "violet" | "blue" | "amber";
}) {
  const t =
    tone === "blue"
      ? "bg-blue-100 text-blue-700 ring-blue-200"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-blue-100 text-blue-700 ring-blue-200";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className={`w-6 h-6 rounded-lg grid place-items-center ring-1 ${t}`}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{value}</p>
    </div>
  );
}

function DropCard({
  icon,
  title,
  subtitle,
  cta,
  hint,
  onClick,
  disabled,
  busy,
  wide,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cta: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${wide ? "" : "h-full"}`}>
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 ring-1 ring-blue-200 grid place-items-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-sm">{title}</p>
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full p-6 sm:p-8 text-center hover:bg-blue-50/50 transition disabled:opacity-60"
      >
        <span className="mx-auto mb-3 w-10 h-10 rounded-full bg-slate-50 border border-slate-200 grid place-items-center text-slate-500">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </span>
        <span className="block text-sm font-semibold text-slate-700">{cta}</span>
        <span className="block text-[11px] text-slate-400 mt-2">{hint}</span>
      </button>
    </div>
  );
}
