import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, ShieldAlert, Gauge, Power, Trash2, RefreshCw, Brush, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import {
  listRateLimitRules,
  updateRateLimitRule,
  listRateLimitBlocks,
  clearRateLimitBlock,
  cleanupRateLimits,
  type RateLimitRule,
  type RateLimitBlock,
} from "@/lib/rate-limit.functions";

export const Route = createFileRoute("/Mahbub214/rate-limits")({
  component: RateLimitsPage,
  head: () => ({
    meta: [
      { title: "Rate Limits — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const CATEGORY_META: Record<string, { en: string; bn: string; tint: string; ring: string }> = {
  auth: { en: "Authentication (strict)", bn: "অথেনটিকেশন (কঠোর)", tint: "bg-rose-50 text-rose-700", ring: "ring-rose-200" },
  public: { en: "Public endpoints (moderate)", bn: "পাবলিক এন্ডপয়েন্ট (মধ্যম)", tint: "bg-amber-50 text-amber-700", ring: "ring-amber-200" },
  authenticated: { en: "Signed-in actions (looser)", bn: "লগইন করা অ্যাকশন (শিথিল)", tint: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200" },
  admin: { en: "Admin panel", bn: "অ্যাডমিন প্যানেল", tint: "bg-violet-50 text-violet-700", ring: "ring-violet-200" },
};

const ORDER = ["auth", "public", "authenticated", "admin"];

function secondsLabel(s: number) {
  if (s <= 0) return "off";
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

function RateLimitsPage() {
  const { t } = useAdminLang();
  const loadRules = useServerFn(listRateLimitRules);
  const saveRule = useServerFn(updateRateLimitRule);
  const loadBlocks = useServerFn(listRateLimitBlocks);
  const unblock = useServerFn(clearRateLimitBlock);
  const cleanup = useServerFn(cleanupRateLimits);

  const [rules, setRules] = useState<RateLimitRule[]>([]);
  const [blocks, setBlocks] = useState<RateLimitBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"rules" | "blocks">("rules");

  const reload = async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([loadRules(), loadBlocks()]);
      setRules(r);
      setBlocks(b);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const patch = (key: string, field: keyof RateLimitRule, value: number | boolean) =>
    setRules((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } as RateLimitRule : r)));

  const onSave = async (r: RateLimitRule) => {
    setSavingKey(r.key);
    try {
      await saveRule({
        data: {
          key: r.key,
          window_seconds: r.window_seconds,
          max_requests: r.max_requests,
          backoff_base_seconds: r.backoff_base_seconds,
          backoff_max_seconds: r.backoff_max_seconds,
          enabled: r.enabled,
        },
      });
      toast.success(t("Saved", "সংরক্ষিত"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, RateLimitRule[]>();
    for (const r of rules) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, [rules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-6 md:p-8 text-white shadow-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("Rate Limits", "রেট লিমিট")}</h1>
              <p className="text-white/85 text-sm mt-1">
                {t(
                  "Configurable per-endpoint throttling with exponential backoff",
                  "প্রতি এন্ডপয়েন্টে কনফিগারযোগ্য থ্রটলিং ও exponential backoff",
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-4 py-2.5 text-sm font-bold hover:bg-white/25"
            >
              <RefreshCw className="w-4 h-4" /> {t("Refresh", "রিফ্রেশ")}
            </button>
            <button
              onClick={async () => {
                try { await cleanup(); toast.success(t("Old records cleaned", "পুরনো রেকর্ড পরিষ্কার হয়েছে")); reload(); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-4 py-2.5 text-sm font-bold shadow hover:shadow-lg"
            >
              <Brush className="w-4 h-4" /> {t("Cleanup", "ক্লিনআপ")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          {([["rules", t("Rules", "নিয়ম")], ["blocks", t("Active blocks", "চলমান ব্লক")]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as "rules" | "blocks")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === id
                  ? "bg-violet-600 text-white shadow"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
              {id === "blocks" && blocks.length > 0 ? ` (${blocks.length})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : tab === "rules" ? (
          <div className="space-y-6">
            {grouped.map(([category, rows]) => {
              const meta = CATEGORY_META[category] ?? { en: category, bn: category, tint: "bg-slate-100 text-slate-700", ring: "ring-slate-200" };
              return (
                <section key={category} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <span className="w-1.5 h-6 rounded-full bg-violet-600" />
                    <h2 className="font-bold text-slate-900">{t(meta.en, meta.bn)}</h2>
                    <span className={`ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${meta.tint} ${meta.ring}`}>
                      {rows.length} {t("rules", "নিয়ম")}
                    </span>
                  </header>

                  <ul className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <li key={r.key} className="p-4 md:p-5 hover:bg-slate-50/60">
                        <div className="flex items-start gap-3 flex-wrap">
                          <button
                            onClick={() => patch(r.key, "enabled", !r.enabled)}
                            title={r.enabled ? "Enabled" : "Disabled"}
                            className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${
                              r.enabled ? "bg-violet-50 text-violet-600 ring-1 ring-violet-200" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{r.label || r.key}</p>
                            <code className="text-[11px] font-mono text-slate-500">{r.key}</code>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {t("Currently", "বর্তমানে")}: <b>{r.max_requests}</b> / {secondsLabel(r.window_seconds)}
                              {r.backoff_base_seconds > 0
                                ? ` · ${t("backoff", "backoff")} ${secondsLabel(r.backoff_base_seconds)} → ${secondsLabel(r.backoff_max_seconds)}`
                                : ` · ${t("no backoff", "backoff নেই")}`}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
                            <Field label={t("Max", "সর্বোচ্চ")} value={r.max_requests} onChange={(v) => patch(r.key, "max_requests", v)} />
                            <Field label={t("Window (s)", "উইন্ডো (সে)")} value={r.window_seconds} onChange={(v) => patch(r.key, "window_seconds", v)} />
                            <Field label={t("Backoff (s)", "Backoff (সে)")} value={r.backoff_base_seconds} onChange={(v) => patch(r.key, "backoff_base_seconds", v)} />
                            <Field label={t("Max wait (s)", "সর্বোচ্চ অপেক্ষা")} value={r.backoff_max_seconds} onChange={(v) => patch(r.key, "backoff_max_seconds", v)} />
                          </div>

                          <button
                            onClick={() => onSave(r)}
                            disabled={savingKey === r.key}
                            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-3.5 py-2 text-xs font-bold shadow hover:bg-violet-700 disabled:opacity-60"
                          >
                            {savingKey === r.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {t("Save", "সেভ")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {blocks.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">{t("No one is throttled right now", "এখন কেউ থ্রটলড নয়")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {blocks.map((b) => {
                  const active = new Date(b.blocked_until).getTime() > Date.now();
                  return (
                    <li key={b.id} className="p-4 flex items-center gap-3 hover:bg-slate-50/60">
                      <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${active ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"}`}>
                        <Timer className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{b.identifier}</p>
                        <code className="text-[11px] font-mono text-slate-500">{b.key}</code>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <p className="font-bold text-slate-700">{b.strikes} {t("strikes", "স্ট্রাইক")}</p>
                        <p>{active ? t("until", "পর্যন্ত") : t("expired", "শেষ")} {new Date(b.blocked_until).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try { await unblock({ data: { id: b.id } }); toast.success(t("Unblocked", "আনব্লক হয়েছে")); reload(); }
                          catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                        }}
                        className="shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        title={t("Clear block", "ব্লক সরান")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="w-full md:w-24 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none"
      />
    </label>
  );
}
