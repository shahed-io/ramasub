import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Upload, Loader2, ShieldCheck, Database, AlertTriangle } from "lucide-react";
import { createBackup, restoreBackup, BACKUP_TABLES } from "@/lib/backup.functions";
import { supabase } from "@/integrations/supabase/client";

type BackupSettings = { auto_backup?: boolean; frequency?: string; retention_days?: number };

export function BackupRestore() {
  const runBackup = useServerFn(createBackup);
  const runRestore = useServerFn(restoreBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "backup" | "restore">("idle");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackupSettings>({ auto_backup: true, frequency: "daily", retention_days: 7 });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_records").select("*").eq("kind", "backup_settings").limit(1);
      const row = data?.[0];
      if (row) { setSettings(row.data as BackupSettings); setSettingsId(row.id); }
      const { data: hist } = await supabase.from("admin_records").select("*").eq("kind", "backup_history").order("created_at", { ascending: false }).limit(1);
      const h = hist?.[0]?.data as { created_at?: string } | undefined;
      if (h?.created_at) setLastBackup(h.created_at);
    })();
  }, []);

  const saveSettings = async () => {
    const payload = { kind: "backup_settings", data: settings as never, is_active: true };
    const op = settingsId
      ? supabase.from("admin_records").update(payload).eq("id", settingsId)
      : supabase.from("admin_records").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("সেটিংস সংরক্ষিত হয়েছে");
  };

  const downloadBackup = async () => {
    try {
      setBusy("backup");
      const result = await runBackup();
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url; a.download = `backup-${stamp}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      await supabase.from("admin_records").insert({
        kind: "backup_history",
        data: { created_at: result.meta.created_at, total_rows: result.meta.total_rows, counts: result.meta.counts } as never,
        is_active: true,
      });
      setLastBackup(result.meta.created_at);
      toast.success(`ব্যাকআপ ডাউনলোড সম্পন্ন (${result.meta.total_rows} সারি)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally { setBusy("idle"); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm(`Restore from "${file.name}"?\nMode: ${mode.toUpperCase()}\n${mode === "replace" ? "⚠️ Existing data in selected tables will be DELETED." : "Existing rows will be updated by primary key."}`)) return;
    try {
      setBusy("restore");
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.tables || typeof parsed.tables !== "object") throw new Error("Invalid backup file");
      const res = await runRestore({ data: { payloadJson: text, mode } });
      const total = Object.values(res.results).reduce((a, b) => a + (b.restored || 0), 0);
      const errs = Object.entries(res.results).filter(([, v]) => v.error);
      if (errs.length) {
        toast.warning(`আংশিক সফল: ${total} সারি পুনরুদ্ধার। ত্রুটি: ${errs.map(([k, v]) => `${k}: ${v.error}`).join("; ")}`);
      } else {
        toast.success(`পুনরুদ্ধার সফল — ${total} সারি`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally { setBusy("idle"); }
  };

  const tableList = Object.keys(BACKUP_TABLES);

  return (
    <div className="space-y-6">
      {/* Action cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center"><Download className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-slate-900">ব্যাকআপ ডাউনলোড</h3>
              <p className="text-xs text-slate-500">সব টেবিল একটি JSON ফাইলে এক্সপোর্ট করুন</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">শেষ ব্যাকআপ: {lastBackup ? new Date(lastBackup).toLocaleString() : "এখনো নেই"}</p>
          <button
            onClick={downloadBackup}
            disabled={busy !== "idle"}
            className="w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy === "backup" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy === "backup" ? "ব্যাকআপ তৈরি হচ্ছে…" : "এখনই ব্যাকআপ নিন"}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center"><Upload className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-slate-900">রিস্টোর করুন</h3>
              <p className="text-xs text-slate-500">JSON ব্যাকআপ ফাইল থেকে ডেটা পুনরুদ্ধার করুন</p>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">মোড</label>
            <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              {(["merge", "replace"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 h-8 rounded-full transition ${mode === m ? "bg-slate-900 text-white" : "text-slate-600"}`}>
                  {m === "merge" ? "Merge (upsert)" : "Replace (clear + insert)"}
                </button>
              ))}
            </div>
            {mode === "replace" && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> বিদ্যমান ডেটা মুছে ফেলা হবে</p>
            )}
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== "idle"}
            className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy === "restore" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy === "restore" ? "পুনরুদ্ধার চলছে…" : "ব্যাকআপ ফাইল আপলোড করুন"}
          </button>
        </div>
      </div>

      {/* Tables included */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-slate-600" />
          <h3 className="font-bold text-slate-900">ব্যাকআপে যুক্ত টেবিলসমূহ ({tableList.length})</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {tableList.map((t) => (
            <span key={t} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">{t}</span>
          ))}
        </div>
      </div>

      {/* Auto-backup settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          <h3 className="font-bold text-slate-900">অটো ব্যাকআপ সেটিংস</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex items-center justify-between gap-3 px-4 h-12 rounded-xl border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Auto backup</span>
            <input type="checkbox" checked={!!settings.auto_backup} onChange={(e) => setSettings({ ...settings, auto_backup: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
          </label>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Frequency</label>
            <select value={settings.frequency ?? "daily"} onChange={(e) => setSettings({ ...settings, frequency: e.target.value })} className="mt-1 w-full h-12 px-4 rounded-xl border border-slate-200 bg-white">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Retention (days)</label>
            <input type="number" min={1} value={settings.retention_days ?? 7} onChange={(e) => setSettings({ ...settings, retention_days: Number(e.target.value) })} className="mt-1 w-full h-12 px-4 rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">নোট: অটো-ব্যাকআপ চালু থাকলেও বর্তমানে ব্যাকআপ ম্যানুয়ালি ডাউনলোড করতে হবে। শিডিউলড সার্ভার-সাইড অটো-রান শীঘ্রই যুক্ত হবে।</p>
        <div className="mt-4 flex justify-end">
          <button onClick={saveSettings} className="h-10 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">Save settings</button>
        </div>
      </div>
    </div>
  );
}
