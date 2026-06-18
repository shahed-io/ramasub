import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Users as UsersIcon,
  Activity as ActivityIcon,
  Code2,
  Save,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  TestTube,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import { useServerFn } from "@tanstack/react-start";
import { syncFbAudience } from "@/lib/fb-capi.functions";
import { trackEvent } from "@/lib/trackEvent";

type Provider = "facebook_pixel" | "fb_audience" | "google_ads" | "other";

type PixelRow = {
  id: string;
  provider: string;
  label: string | null;
  pixel_id: string | null;
  access_token: string | null;
  account_id: string | null;
  conversion_label: string | null;
  enabled: boolean;
  custom_script: string | null;
  notes: string | null;
  events_config: Record<string, unknown>;
  sort_order: number;
};

type EventLog = {
  id: string;
  provider: string;
  event_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const TABS: { key: Provider; en: string; bn: string; icon: typeof BarChart3 }[] = [
  { key: "facebook_pixel", en: "Facebook Pixel", bn: "ফেসবুক পিক্সেল", icon: BarChart3 },
  { key: "fb_audience", en: "FB Custom Audiences", bn: "এফবি কাস্টম অডিয়েন্স", icon: UsersIcon },
  { key: "google_ads", en: "Google Ads", bn: "গুগল অ্যাডস", icon: ActivityIcon },
  { key: "other", en: "Other Pixels", bn: "অন্যান্য পিক্সেল", icon: Code2 },
];

type Search = { tab?: Provider };

export const Route = createFileRoute("/admin/tracking-pixels")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: (s.tab as Provider) || undefined,
  }),
  component: TrackingPixelsPage,
  head: () => ({
    meta: [
      { title: "Tracking & Pixels — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function TrackingPixelsPage() {
  const { t } = useAdminLang();
  const search = useSearch({ from: "/admin/tracking-pixels" });
  const [tab, setTab] = useState<Provider>(search.tab || "facebook_pixel");
  const [rows, setRows] = useState<Record<Provider, PixelRow | null>>({
    facebook_pixel: null,
    fb_audience: null,
    google_ads: null,
    other: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tracking_pixels")
      .select("*")
      .in("provider", ["facebook_pixel", "fb_audience", "google_ads", "other"])
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    const next: Record<Provider, PixelRow | null> = {
      facebook_pixel: null,
      fb_audience: null,
      google_ads: null,
      other: null,
    };
    (data ?? []).forEach((r) => {
      const p = r.provider as Provider;
      if (p in next && !next[p]) next[p] = r as PixelRow;
    });
    setRows(next);
    setLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("tracking_events_log")
      .select("id, provider, event_name, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((data ?? []) as EventLog[]);
  }, []);

  useEffect(() => {
    void load();
    void loadLogs();
  }, [load, loadLogs]);

  const current = rows[tab];

  const update = (patch: Partial<PixelRow>) =>
    setRows((p) => ({
      ...p,
      [tab]: { ...(p[tab] ?? blankRow(tab)), ...patch } as PixelRow,
    }));

  const save = async () => {
    setSaving(true);
    const r = rows[tab] ?? blankRow(tab);
    const payload = {
      provider: tab,
      label: r.label,
      pixel_id: r.pixel_id,
      access_token: r.access_token,
      account_id: r.account_id,
      conversion_label: r.conversion_label,
      enabled: r.enabled,
      custom_script: r.custom_script,
      notes: r.notes,
      events_config: r.events_config ?? {},
    } as never;
    const { error } = r.id
      ? await supabase.from("tracking_pixels").update(payload).eq("id", r.id)
      : await supabase.from("tracking_pixels").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Saved", "সংরক্ষিত"));
    await load();
  };

  const fireFn = useServerFn(syncFbAudience);
  const [syncing, setSyncing] = useState(false);
  const runSync = async (testMode = false) => {
    setSyncing(true);
    const res = await fireFn({
      data: { sinceDays: 30, testCode: testMode ? "TEST12345" : undefined },
    });
    setSyncing(false);
    if (!res.ok) {
      toast.error(res.error || "Sync failed");
    } else {
      toast.success(
        `${res.sent} events sent${res.events_received !== undefined ? ` · received ${res.events_received}` : ""}`
      );
    }
    await loadLogs();
  };

  const testClient = () => {
    trackEvent("Lead", { test: true, source: "admin_test" });
    toast.success(t("Test event fired", "টেস্ট ইভেন্ট পাঠানো হয়েছে"));
  };

  const tabMeta = TABS.find((x) => x.key === tab)!;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {t("Tracking & Pixels", "ট্র্যাকিং ও পিক্সেল")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Configure Facebook Pixel, Custom Audiences, Google Ads & other tracking scripts",
              "ফেসবুক পিক্সেল, কাস্টম অডিয়েন্স, গুগল অ্যাডস ও অন্যান্য ট্র্যাকিং স্ক্রিপ্ট কনফিগার করুন"
            )}
          </p>
        </div>
        <button
          onClick={testClient}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <TestTube className="w-4 h-4" />
          {t("Fire test event", "টেস্ট ইভেন্ট")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl w-fit">
        {TABS.map((x) => {
          const Icon = x.icon;
          const active = tab === x.key;
          return (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition ${
                active
                  ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(x.en, x.bn)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-sm text-slate-500 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          {t("Loading…", "লোড হচ্ছে…")}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-7 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-700">
                <tabMeta.icon className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">{t(tabMeta.en, tabMeta.bn)}</h3>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch
                value={current?.enabled ?? false}
                onChange={(v) => update({ enabled: v })}
              />
              <span className="text-sm font-semibold text-slate-700">
                {(current?.enabled ?? false)
                  ? t("Enabled", "চালু")
                  : t("Disabled", "বন্ধ")}
              </span>
            </div>
          </div>

          {tab === "facebook_pixel" && (
            <FbPixelForm row={current} onChange={update} />
          )}
          {tab === "fb_audience" && (
            <FbAudienceForm row={current} onChange={update} onSync={runSync} syncing={syncing} />
          )}
          {tab === "google_ads" && <GoogleAdsForm row={current} onChange={update} />}
          {tab === "other" && <OtherPixelForm row={current} onChange={update} />}

          <Field label={t("Notes (internal)", "নোট (অভ্যন্তরীণ)")}>
            <textarea
              value={current?.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value })}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </Field>

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? t("Saving…", "সংরক্ষণ হচ্ছে…") : t("Save", "সংরক্ষণ")}
            </button>
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900">
            {t("Recent Events", "সাম্প্রতিক ইভেন্ট")}
          </h3>
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {t("No events yet", "এখনো কোনো ইভেন্ট নেই")}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((l) => {
              const ok = l.status === "sent";
              return (
                <div key={l.id} className="flex items-center gap-3 p-4 text-sm">
                  <span
                    className={`shrink-0 w-7 h-7 rounded-lg grid place-items-center ${
                      ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {ok ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800">
                      {l.provider} · {l.event_name}
                    </div>
                    {l.error_message && (
                      <div className="text-xs text-rose-600 truncate">{l.error_message}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">
                    {new Date(l.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function blankRow(provider: Provider): PixelRow {
  return {
    id: "",
    provider,
    label: null,
    pixel_id: null,
    access_token: null,
    account_id: null,
    conversion_label: null,
    enabled: false,
    custom_script: null,
    notes: null,
    events_config: {},
    sort_order: 0,
  };
}

function FbPixelForm({
  row,
  onChange,
}: {
  row: PixelRow | null;
  onChange: (p: Partial<PixelRow>) => void;
}) {
  const { t } = useAdminLang();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label={t("Pixel ID", "পিক্সেল ID")} hint="e.g. 1234567890123456">
        <input
          value={row?.pixel_id ?? ""}
          onChange={(e) => onChange({ pixel_id: e.target.value })}
          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </Field>
      <Field
        label={t("CAPI Access Token (optional)", "CAPI অ্যাক্সেস টোকেন (ঐচ্ছিক)")}
        hint={t("For Conversions API", "Conversions API-এর জন্য")}
      >
        <input
          type="password"
          value={row?.access_token ?? ""}
          onChange={(e) => onChange({ access_token: e.target.value })}
          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </Field>
    </div>
  );
}

function FbAudienceForm({
  row,
  onChange,
  onSync,
  syncing,
}: {
  row: PixelRow | null;
  onChange: (p: Partial<PixelRow>) => void;
  onSync: (testMode?: boolean) => void;
  syncing: boolean;
}) {
  const { t } = useAdminLang();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t("Ad Account ID", "অ্যাড অ্যাকাউন্ট ID")} hint="act_XXXXXXXXXXXXX">
          <input
            value={row?.account_id ?? ""}
            onChange={(e) => onChange({ account_id: e.target.value })}
            className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </Field>
        <Field
          label={t("System User Token", "সিস্টেম ইউজার টোকেন")}
          hint={t("Overrides FB_CAPI_ACCESS_TOKEN secret", "FB_CAPI_ACCESS_TOKEN সিক্রেট ওভাররাইড করে")}
        >
          <input
            type="password"
            value={row?.access_token ?? ""}
            onChange={(e) => onChange({ access_token: e.target.value })}
            className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </Field>
      </div>

      <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
        <div className="text-sm font-bold text-violet-900 mb-1">
          {t("Sync customers to Meta", "Meta-তে কাস্টমার সিঙ্ক করুন")}
        </div>
        <p className="text-xs text-violet-700 mb-3">
          {t(
            "Sends hashed email/phone from completed orders (last 30 days) to your Pixel as Purchase events for Custom Audiences. Make sure Facebook Pixel tab has a Pixel ID first.",
            "গত ৩০ দিনের সম্পূর্ণ অর্ডার থেকে হ্যাশড ইমেইল/ফোন আপনার পিক্সেলে Purchase ইভেন্ট হিসেবে পাঠাবে। আগে Facebook Pixel ট্যাবে Pixel ID সেভ করুন।"
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSync(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-violet-200 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {t("Test sync", "টেস্ট সিঙ্ক")}
          </button>
          <button
            onClick={() => onSync(false)}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t("Sync now", "এখন সিঙ্ক করুন")}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleAdsForm({
  row,
  onChange,
}: {
  row: PixelRow | null;
  onChange: (p: Partial<PixelRow>) => void;
}) {
  const { t } = useAdminLang();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label={t("Tag ID (AW- / G-)", "ট্যাগ ID (AW- / G-)")} hint="AW-123456789 or G-XXXXXXXXXX">
        <input
          value={row?.pixel_id ?? ""}
          onChange={(e) => onChange({ pixel_id: e.target.value })}
          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </Field>
      <Field label={t("Conversion Label (optional)", "কনভার্সন লেবেল (ঐচ্ছিক)")}>
        <input
          value={row?.conversion_label ?? ""}
          onChange={(e) => onChange({ conversion_label: e.target.value })}
          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </Field>
    </div>
  );
}

function OtherPixelForm({
  row,
  onChange,
}: {
  row: PixelRow | null;
  onChange: (p: Partial<PixelRow>) => void;
}) {
  const { t } = useAdminLang();
  return (
    <div className="space-y-4">
      <Field
        label={t("Custom Script / HTML", "কাস্টম স্ক্রিপ্ট / HTML")}
        hint={t(
          "Paste any pixel snippet (TikTok, Snapchat, GTM, etc.). Scripts execute on every public page.",
          "যেকোনো পিক্সেল স্নিপেট পেস্ট করুন (TikTok, Snapchat, GTM)। সব পাবলিক পেজে চালু হবে।"
        )}
      >
        <textarea
          value={row?.custom_script ?? ""}
          onChange={(e) => onChange({ custom_script: e.target.value })}
          rows={10}
          spellCheck={false}
          placeholder={`<script>\n  /* pixel snippet here */\n</script>`}
          className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-700 mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}

function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${
        value ? "bg-violet-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
