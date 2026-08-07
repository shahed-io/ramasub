import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  ShieldCheck,
  Save,
  RefreshCw,
  Brush,
  Bot,
  Waves,
  Cpu,
  Gauge,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import {
  getBotProtectionSettings,
  updateBotProtectionSettings,
  cleanupBotShieldFn,
  type BotProtectionSettings,
} from "@/lib/bot-shield.functions";

export const Route = createFileRoute("/Mahbub214/bot-protection")({
  component: BotProtectionPage,
  head: () => ({
    meta: [
      { title: "DDoS & Bot Protection — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function Toggle({
  on,
  onChange,
  label,
  desc,
  icon,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white ring-1 ring-slate-200">
      <span className="shrink-0 w-10 h-10 rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-200 grid place-items-center">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`shrink-0 w-12 h-7 rounded-full transition relative ${on ? "bg-violet-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}

function BotProtectionPage() {
  const { t } = useAdminLang();
  const load = useServerFn(getBotProtectionSettings);
  const save = useServerFn(updateBotProtectionSettings);
  const cleanup = useServerFn(cleanupBotShieldFn);

  const [s, setS] = useState<BotProtectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setS(await load());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (p: Partial<BotProtectionSettings>) => setS((prev) => (prev ? { ...prev, ...p } : prev));

  const onSave = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const saved = await save({
        data: {
          shield_enabled: s.shield_enabled,
          pow_enabled: s.pow_enabled,
          pow_difficulty: s.pow_difficulty,
          turnstile_enabled: s.turnstile_enabled,
          turnstile_site_key: s.turnstile_site_key.trim(),
          ddos_enabled: s.ddos_enabled,
        },
      });
      setS(saved);
      toast.success(t("Saved", "সংরক্ষিত"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-6 md:p-8 text-white shadow-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("DDoS & Bot Protection", "DDoS ও বট প্রোটেকশন")}</h1>
              <p className="text-white/85 text-sm mt-1">
                {t(
                  "Cloudflare-style flood protection and human verification on signup",
                  "Cloudflare-এর মতো ফ্লাড প্রোটেকশন ও সাইনআপে হিউম্যান ভেরিফিকেশন",
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
                try {
                  const r = await cleanup();
                  toast.success(t(`Cleaned ${r.removed} records`, `${r.removed}টি রেকর্ড পরিষ্কার হয়েছে`));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-4 py-2.5 text-sm font-bold shadow hover:shadow-lg"
            >
              <Brush className="w-4 h-4" /> {t("Cleanup", "ক্লিনআপ")}
            </button>
          </div>
        </div>

        {loading || !s ? (
          <div className="py-20 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* DDoS */}
            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <span className="w-1.5 h-6 rounded-full bg-violet-600" />
                <h2 className="font-bold text-slate-900">{t("DDoS shield", "DDoS শিল্ড")}</h2>
                <Link
                  to="/Mahbub214/rate-limits"
                  className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-bold text-violet-700 hover:underline"
                >
                  <Gauge className="w-3.5 h-3.5" /> {t("Tune thresholds", "থ্রেশহোল্ড সেট করুন")}
                </Link>
              </header>
              <div className="p-4 md:p-5 space-y-3">
                <Toggle
                  on={s.ddos_enabled}
                  onChange={(v) => patch({ ddos_enabled: v })}
                  icon={<Waves className="w-5 h-5" />}
                  label={t("Flood / burst protection", "ফ্লাড ও বার্স্ট প্রোটেকশন")}
                  desc={t(
                    "Every request is counted per IP. Abusive bursts get an automatic 429 page with exponential backoff, visible in Rate Limits → Active blocks.",
                    "প্রতিটি রিকোয়েস্ট IP অনুযায়ী গোনা হয়। অস্বাভাবিক ট্রাফিক স্বয়ংক্রিয়ভাবে ৪২৯ পেজ পায় (exponential backoff), যা Rate Limits → Active blocks-এ দেখা যায়।",
                  )}
                />
                <p className="text-[12px] text-slate-500 px-1">
                  {t(
                    "Rules used: ddos.burst.ip (short spikes) and ddos.global.ip (sustained flood).",
                    "ব্যবহৃত নিয়ম: ddos.burst.ip (স্বল্প সময়ের স্পাইক) ও ddos.global.ip (দীর্ঘ ফ্লাড)।",
                  )}
                </p>
              </div>
            </section>

            {/* Bot verification */}
            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <span className="w-1.5 h-6 rounded-full bg-violet-600" />
                <h2 className="font-bold text-slate-900">{t("Bot verification (signup)", "বট ভেরিফিকেশন (সাইনআপ)")}</h2>
              </header>
              <div className="p-4 md:p-5 space-y-3">
                <Toggle
                  on={s.shield_enabled}
                  onChange={(v) => patch({ shield_enabled: v })}
                  icon={<Bot className="w-5 h-5" />}
                  label={t("Enable bot shield", "বট শিল্ড চালু করুন")}
                  desc={t(
                    "Master switch. When off, accounts can be created without any human check.",
                    "মাস্টার সুইচ। বন্ধ থাকলে কোনো হিউম্যান চেক ছাড়াই অ্যাকাউন্ট তৈরি হবে।",
                  )}
                />
                <Toggle
                  on={s.pow_enabled}
                  onChange={(v) => patch({ pow_enabled: v })}
                  icon={<Cpu className="w-5 h-5" />}
                  label={t("Built-in shield (invisible)", "বিল্ট-ইন শিল্ড (ইনভিজিবল)")}
                  desc={t(
                    "Proof-of-work + honeypot + timing check. No external keys needed and no puzzle for the customer.",
                    "Proof-of-work + honeypot + timing চেক। কোনো external key লাগে না, কাস্টমারকে কোনো পাজলও দিতে হয় না।",
                  )}
                />

                <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 space-y-3">
                  <label className="block text-[12px] font-bold text-slate-700">
                    {t("Difficulty", "ডিফিকাল্টি")} — {s.pow_difficulty}
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    step={1}
                    value={s.pow_difficulty}
                    onChange={(e) => patch({ pow_difficulty: Number(e.target.value) })}
                    className="w-full accent-violet-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    {t(
                      "3–4 is recommended. Higher values cost bots much more CPU, but also slow real users down.",
                      "৩–৪ সবচেয়ে ভালো। বেশি মান বটের CPU খরচ অনেক বাড়ায়, তবে আসল ইউজারও কিছুটা ধীর হয়।",
                    )}
                  </p>
                </div>

                <Toggle
                  on={s.turnstile_enabled}
                  onChange={(v) => patch({ turnstile_enabled: v })}
                  icon={<ShieldCheck className="w-5 h-5" />}
                  label={t("Cloudflare Turnstile", "Cloudflare Turnstile")}
                  desc={t(
                    "Real Cloudflare bot check on top of the built-in shield. Needs a Site Key below plus the TURNSTILE_SECRET_KEY secret.",
                    "বিল্ট-ইন শিল্ডের সাথে আসল Cloudflare বট-চেক। নিচে Site Key ও TURNSTILE_SECRET_KEY সিক্রেট লাগবে।",
                  )}
                />

                <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 space-y-2">
                  <label className="block text-[12px] font-bold text-slate-700">
                    {t("Turnstile Site Key", "Turnstile Site Key")}
                  </label>
                  <input
                    value={s.turnstile_site_key}
                    onChange={(e) => patch({ turnstile_site_key: e.target.value })}
                    placeholder="0x4AAAAAAA..."
                    className="w-full h-11 rounded-xl bg-white ring-1 ring-slate-200 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${
                        s.turnstile_secret_configured
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <KeyRound className="w-3 h-3" />
                      {s.turnstile_secret_configured
                        ? t("Secret key configured", "সিক্রেট কী সেট আছে")
                        : t("Secret key missing", "সিক্রেট কী নেই")}
                    </span>
                    <a
                      href="https://dash.cloudflare.com/?to=/:account/turnstile"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-violet-700 hover:underline"
                    >
                      {t("Get keys from Cloudflare", "Cloudflare থেকে key নিন")} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 text-sm font-bold shadow-lg disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("Save settings", "সেটিংস সেভ করুন")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
