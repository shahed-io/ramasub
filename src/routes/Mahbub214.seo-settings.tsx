import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Search, Globe, BarChart3, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getSeoSettings, saveSeoSettings, DEFAULT_SEO_SETTINGS, type SeoSettings } from "@/lib/seo-settings.functions";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/seo-settings")({
  component: SeoSettingsPage,
  head: () => ({ meta: [{ title: "SEO Settings — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function SeoSettingsPage() {
  const { t } = useAdminLang();
  const load = useServerFn(getSeoSettings);
  const save = useServerFn(saveSeoSettings);
  const [s, setS] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load().then((d) => setS(d)).finally(() => setLoading(false));
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: s });
      toast.success(t("SEO settings saved", "SEO সেটিংস সংরক্ষিত"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof SeoSettings>(k: K, v: SeoSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  if (loading) {
    return <div className="min-h-[40vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("Global SEO Settings", "গ্লোবাল SEO সেটিংস")}</h1>
              <p className="text-white/80 text-sm mt-1">{t("Verification meta tags, default OG, Analytics ID — সাইট-wide", "ভেরিফিকেশন মেটা ট্যাগ, ডিফল্ট OG, অ্যানালিটিক্স ID — সাইটব্যাপী")}</p>
            </div>
          </div>
        </div>

        <Section icon={<Globe className="w-5 h-5" />} title={t("Default Meta", "ডিফল্ট মেটা")}>
          <Field label={t("Default site title", "ডিফল্ট সাইট টাইটেল")} hint="50–60 chars">
            <input className={inp} value={s.site_title} onChange={(e) => set("site_title", e.target.value)} placeholder="Rama Sub | Trusted Digital Services" />
            <Counter v={s.site_title} min={30} max={60} />
          </Field>
          <Field label={t("Default description", "ডিফল্ট ডেসক্রিপশন")} hint="120–160 chars">
            <textarea className={`${inp} min-h-[80px]`} value={s.site_description} onChange={(e) => set("site_description", e.target.value)} />
            <Counter v={s.site_description} min={120} max={160} />
          </Field>
          <Field label={t("Default OG image URL", "ডিফল্ট OG ইমেজ URL")} hint="1200×630 recommended">
            <input className={inp} value={s.og_image} onChange={(e) => set("og_image", e.target.value)} placeholder="https://…/og.png" />
            {s.og_image && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-md">
                <img src={s.og_image} alt="OG preview" className="w-full h-auto" />
              </div>
            )}
          </Field>
          <Field label={t("Twitter handle", "টুইটার হ্যান্ডেল")}>
            <input className={inp} value={s.twitter_handle} onChange={(e) => set("twitter_handle", e.target.value)} placeholder="@ramasub" />
          </Field>
        </Section>

        <Section icon={<ShieldCheck className="w-5 h-5" />} title={t("Search Engine Verification", "সার্চ ইঞ্জিন ভেরিফিকেশন")}>
          <p className="text-sm text-slate-600 -mt-2 mb-4">
            {t("Paste only the content value of the meta tag (not the whole tag).", "মেটা ট্যাগের শুধু content মান বসান (পুরো ট্যাগ নয়)।")}
          </p>
          <Field label="Google Search Console" hint="google-site-verification">
            <input className={inp} value={s.google_site_verification} onChange={(e) => set("google_site_verification", e.target.value)} placeholder="abc123..." />
          </Field>
          <Field label="Bing Webmaster Tools" hint="msvalidate.01">
            <input className={inp} value={s.bing_site_verification} onChange={(e) => set("bing_site_verification", e.target.value)} />
          </Field>
          <Field label="Yandex Webmaster" hint="yandex-verification">
            <input className={inp} value={s.yandex_site_verification} onChange={(e) => set("yandex_site_verification", e.target.value)} />
          </Field>
          <Field label="Facebook Domain Verification" hint="facebook-domain-verification">
            <input className={inp} value={s.facebook_domain_verification} onChange={(e) => set("facebook_domain_verification", e.target.value)} />
          </Field>
        </Section>

        <Section icon={<BarChart3 className="w-5 h-5" />} title={t("Analytics", "অ্যানালিটিক্স")}>
          <Field label="Google Analytics 4 Measurement ID" hint="G-XXXXXXXXXX">
            <input className={inp} value={s.ga4_measurement_id} onChange={(e) => set("ga4_measurement_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
          </Field>
          <Field label="Google Tag Manager ID" hint="GTM-XXXXXXX (optional)">
            <input className={inp} value={s.google_tag_manager_id} onChange={(e) => set("google_tag_manager_id", e.target.value)} placeholder="GTM-XXXXXXX" />
          </Field>
        </Section>

        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-lg p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 hidden sm:block"><ImageIcon className="w-3.5 h-3.5 inline" /> {t("Saved values appear sitewide within ~60 seconds.", "সেভ করার ~৬০ সেকেন্ডের মধ্যে সাইটে দেখাবে।")}</p>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow hover:shadow-lg disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("Save settings", "সেটিংস সেভ করুন")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
function Counter({ v, min, max }: { v: string; min: number; max: number }) {
  const n = v?.length ?? 0;
  const ok = n >= min && n <= max;
  return (
    <div className={`mt-1 text-[11px] font-medium ${n === 0 ? "text-slate-400" : ok ? "text-emerald-600" : "text-violet-600"}`}>
      {n} / {max} {n > 0 && !ok && `(target ${min}–${max})`}
    </div>
  );
}
