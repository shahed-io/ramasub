import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, Users, ShoppingBag, MessageSquare, Star, Mail, Save, RefreshCw, Radio,
  ExternalLink, HelpCircle, CheckCircle2, AlertCircle, Copy, Eye, EyeOff, Sparkles,
  BookOpen, Settings, Zap, ChevronDown, ChevronRight, PlayCircle, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/ga4-realtime")({
  component: GA4RealtimePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "GA4 Realtime — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

// ────────────────────────────────────────────────────────────────────────────
// Types & storage
// ────────────────────────────────────────────────────────────────────────────

type WidgetKey =
  | "active_users" | "orders" | "revenue" | "tickets"
  | "reviews" | "subscribers" | "chat";

type GA4Config = {
  property_id?: string;
  measurement_id?: string;
  api_secret?: string;
  refresh_seconds?: number;
  active_window_minutes?: number;
  widgets?: Partial<Record<WidgetKey, boolean>>;
  low_stock_threshold?: number;
  alert_new_order?: boolean;
  alert_new_ticket?: boolean;
};

const DEFAULT_CFG: Required<Omit<GA4Config, "property_id" | "measurement_id" | "api_secret">> & GA4Config = {
  property_id: "",
  measurement_id: "",
  api_secret: "",
  refresh_seconds: 15,
  active_window_minutes: 30,
  widgets: {
    active_users: true, orders: true, revenue: true, tickets: true,
    reviews: true, subscribers: true, chat: true,
  },
  low_stock_threshold: 5,
  alert_new_order: true,
  alert_new_ticket: true,
};

function timeAgo(iso: string, t: (en: string, bn: string) => string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}${t("s ago", "সে আগে")}`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${t("m ago", "মি আগে")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("h ago", "ঘ আগে")}`;
  return `${Math.floor(h / 24)}${t("d ago", "দি আগে")}`;
}

async function fetchConfig(): Promise<GA4Config> {
  const { data } = await supabase.from("admin_records").select("data").eq("kind", "ga4_realtime").maybeSingle();
  return ((data?.data as GA4Config) ?? {}) as GA4Config;
}

async function saveConfig(cfg: GA4Config) {
  const { data: existing } = await supabase.from("admin_records").select("id").eq("kind", "ga4_realtime").maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from("admin_records").update({ data: cfg, is_active: true }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("admin_records").insert({ kind: "ga4_realtime", data: cfg, is_active: true, sort_order: 0 });
    if (error) throw error;
  }
}

async function fetchRealtime(windowMinutes: number) {
  const now = new Date();
  const activeSince = new Date(now.getTime() - windowMinutes * 60_000).toISOString();
  const hour24 = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const [orders30, orders24h, tickets, reviews, subs, chat, wae] = await Promise.all([
    supabase.from("orders").select("id,email,full_name,total,status,created_at,items").gte("created_at", activeSince).order("created_at", { ascending: false }),
    supabase.from("orders").select("id,total,status,created_at").gte("created_at", hour24).order("created_at", { ascending: false }),
    supabase.from("support_tickets").select("id,subject,status,created_at,user_id").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("product_reviews").select("id,rating,comment,created_at,reviewer_name,product_slug").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("newsletter_subscribers").select("id,email,created_at").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("live_chat_messages").select("id,content,created_at,role").gte("created_at", activeSince).order("created_at", { ascending: false }).limit(10),
    supabase.from("web_analytics_events").select("visitor_id,path,country,country_name,city,device,referrer_host,created_at").gte("created_at", activeSince).order("created_at", { ascending: false }).limit(200),
  ]);

  return {
    ordersRecent: orders30.data ?? [],
    orders24h: orders24h.data ?? [],
    tickets: tickets.data ?? [],
    reviews: reviews.data ?? [],
    subs: subs.data ?? [],
    chat: chat.data ?? [],
    liveVisits: wae.data ?? [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// UI helpers
// ────────────────────────────────────────────────────────────────────────────

function HelpTip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex w-4 h-4 items-center justify-center rounded-full text-slate-400 hover:text-violet-600 align-middle"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span className="absolute z-30 left-6 top-0 w-72 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed p-3 shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>{icon}</div>
      <div className="mt-3 text-2xl font-black text-slate-900 tabular-nums">{value}</div>
      <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Accordion({
  title, icon, defaultOpen = false, children, badge,
}: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 text-left"
      >
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center [&_svg]:w-4 [&_svg]:h-4">
          {icon}
        </span>
        <span className="flex-1 font-bold text-slate-800 text-sm">{title}</span>
        {badge}
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 py-4 border-t border-slate-100">{children}</div>}
    </div>
  );
}

function Field({
  label, required, tip, error, children,
}: { label: string; required?: boolean; tip?: React.ReactNode; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {tip && <HelpTip>{tip}</HelpTip>}
      </div>
      {children}
      {error && <div className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</div>}
    </label>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50 text-left"
    >
      <span className={`relative w-9 h-5 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </span>
      <span className="flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-800">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 font-semibold">{sub}</div>}
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────────

function validatePropertyId(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (!/^\d{6,15}$/.test(s)) return "Property ID must be 6–15 digits only (no G- prefix)";
  return null;
}
function validateMeasurementId(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (!/^G-[A-Z0-9]{6,15}$/i.test(s)) return "Format: G-XXXXXXXXXX (starts with G-)";
  return null;
}
function validateApiSecret(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (s.length < 10) return "Looks too short — API secrets are ~22 characters";
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

function GA4RealtimePage() {
  const { t } = useAdminLang();
  const qc = useQueryClient();

  const { data: cfgRaw } = useQuery({ queryKey: ["ga4-realtime-config"], queryFn: fetchConfig, staleTime: 60_000 });
  const cfg = useMemo<GA4Config>(() => ({ ...DEFAULT_CFG, ...(cfgRaw ?? {}), widgets: { ...DEFAULT_CFG.widgets, ...(cfgRaw?.widgets ?? {}) } }), [cfgRaw]);

  const [propertyId, setPropertyId] = useState("");
  const [measurementId, setMeasurementId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [refresh, setRefresh] = useState(DEFAULT_CFG.refresh_seconds);
  const [windowMin, setWindowMin] = useState(DEFAULT_CFG.active_window_minutes);
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>(DEFAULT_CFG.widgets as Record<WidgetKey, boolean>);
  const [lowStock, setLowStock] = useState(DEFAULT_CFG.low_stock_threshold);
  const [alertOrder, setAlertOrder] = useState(DEFAULT_CFG.alert_new_order);
  const [alertTicket, setAlertTicket] = useState(DEFAULT_CFG.alert_new_ticket);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!cfgRaw) return;
    setPropertyId(cfgRaw.property_id ?? "");
    setMeasurementId(cfgRaw.measurement_id ?? "");
    setApiSecret(cfgRaw.api_secret ?? "");
    setRefresh(cfgRaw.refresh_seconds ?? DEFAULT_CFG.refresh_seconds);
    setWindowMin(cfgRaw.active_window_minutes ?? DEFAULT_CFG.active_window_minutes);
    setWidgets({ ...DEFAULT_CFG.widgets, ...(cfgRaw.widgets ?? {}) } as Record<WidgetKey, boolean>);
    setLowStock(cfgRaw.low_stock_threshold ?? DEFAULT_CFG.low_stock_threshold);
    setAlertOrder(cfgRaw.alert_new_order ?? DEFAULT_CFG.alert_new_order);
    setAlertTicket(cfgRaw.alert_new_ticket ?? DEFAULT_CFG.alert_new_ticket);
  }, [cfgRaw]);

  const errPid = validatePropertyId(propertyId);
  const errMid = validateMeasurementId(measurementId);
  const errSecret = validateApiSecret(apiSecret);
  const isConfigured = Boolean(propertyId && measurementId && apiSecret) && !errPid && !errMid && !errSecret;

  const refreshMs = Math.max(5, Math.min(300, refresh)) * 1000;
  const windowMinutes = Math.max(1, Math.min(720, windowMin));

  const { data: rt, isFetching, refetch } = useQuery({
    queryKey: ["ga4-realtime-live", windowMinutes],
    queryFn: () => fetchRealtime(windowMinutes),
    refetchInterval: refreshMs,
    staleTime: 5_000,
  });

  const rev24 = useMemo(() => {
    const s = (rt?.orders24h ?? []).reduce((acc, o) => {
      const st = (o.status || "").toLowerCase();
      if (st.includes("cancel") || st.includes("refund") || st.includes("fail")) return acc;
      return acc + Number(o.total || 0);
    }, 0);
    return Math.round(s).toLocaleString("en-IN");
  }, [rt]);

  const activeUsers = useMemo(() => {
    const set = new Set<string>();
    for (const v of rt?.liveVisits ?? []) if (v.visitor_id) set.add(v.visitor_id);
    for (const o of rt?.ordersRecent ?? []) if (o.email) set.add(`e:${o.email}`);
    return set.size;
  }, [rt]);

  const topCountries = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const v of rt?.liveVisits ?? []) {
      const key = v.country || "??";
      const cur = map.get(key) || { label: v.country_name || v.country || "Unknown", count: 0 };
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [rt]);

  const topPages = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of rt?.liveVisits ?? []) map.set(v.path, (map.get(v.path) || 0) + 1);
    return Array.from(map.entries()).map(([k, c]) => ({ path: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [rt]);

  async function onSave() {
    if (errPid || errMid || errSecret) {
      toast.error(t("Fix validation errors first", "প্রথমে ভ্যালিডেশন এরর ঠিক করুন"));
      return;
    }
    setSaving(true);
    try {
      const payload: GA4Config = {
        property_id: propertyId.trim(),
        measurement_id: measurementId.trim(),
        api_secret: apiSecret.trim(),
        refresh_seconds: refresh,
        active_window_minutes: windowMin,
        widgets, low_stock_threshold: lowStock,
        alert_new_order: alertOrder, alert_new_ticket: alertTicket,
      };
      await saveConfig(payload);
      qc.invalidateQueries({ queryKey: ["ga4-realtime-config"] });
      toast.success(t("Settings saved", "সেটিংস সেভ হয়েছে"));
    } catch {
      toast.error(t("Could not save", "সেভ করা যায়নি"));
    } finally { setSaving(false); }
  }

  async function onTest() {
    if (!measurementId || !apiSecret) {
      toast.error(t("Enter Measurement ID and API Secret first", "প্রথমে Measurement ID ও API Secret দিন"));
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${encodeURIComponent(measurementId.trim())}&api_secret=${encodeURIComponent(apiSecret.trim())}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: "admin_test_" + Date.now(),
          events: [{ name: "admin_connection_test", params: { engagement_time_msec: 100 } }],
        }),
      });
      const json = await res.json().catch(() => ({}));
      const errs = Array.isArray(json?.validationMessages) ? json.validationMessages : [];
      if (errs.length === 0) {
        setTestResult({ ok: true, msg: t("Connection OK — GA4 accepted a test event.", "কানেকশন OK — GA4 টেস্ট ইভেন্ট গ্রহণ করেছে।") });
        toast.success(t("Connection OK", "কানেকশন সফল"));
      } else {
        setTestResult({ ok: false, msg: errs.map((e: any) => e.description || e.fieldPath || "error").join(" · ") });
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message || "Network error" });
    } finally { setTesting(false); }
  }

  function copy(v: string) {
    navigator.clipboard.writeText(v).then(() => toast.success(t("Copied", "কপি হয়েছে")));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 sm:p-6 border border-white/60 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white grid place-items-center shadow-sm relative">
              <Activity className="w-5 h-5 text-orange-600" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-500 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                {t("GA4 Realtime Report", "GA4 রিয়েলটাইম রিপোর্ট")}
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-black uppercase">
                  <Radio className="w-3 h-3" /> Live
                </span>
                {isConfigured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-black uppercase">
                    <CheckCircle2 className="w-3 h-3" /> {t("Connected", "কানেক্টেড")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-black uppercase">
                    <AlertCircle className="w-3 h-3" /> {t("Not connected", "কানেক্টেড নয়")}
                  </span>
                )}
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                {t(`Refreshes every ${refresh}s · Active window ${windowMin} min`, `প্রতি ${refresh} সেকেন্ডে রিফ্রেশ · সক্রিয় উইন্ডো ${windowMin} মিনিট`)}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {t("Refresh now", "এখন রিফ্রেশ")}
          </button>
        </div>
      </div>

      {/* Setup wizard for new admins */}
      {!isConfigured && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border border-indigo-100 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base font-black text-slate-900">{t("Set up GA4 in 3 steps", "৩ ধাপে GA4 সেটআপ")}</h3>
              <ol className="mt-2 space-y-1.5 text-xs font-semibold text-slate-700 list-decimal ml-4">
                <li>{t("Open ", "খুলুন ")}<a href="https://analytics.google.com/analytics/web/#/admin" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google Analytics Admin</a>{t(" → Admin → Property Settings → copy the Property ID.", " → Admin → Property Settings → Property ID কপি করুন।")}</li>
                <li>{t("Admin → Data Streams → click your web stream → copy the Measurement ID (G-XXXX).", "Admin → Data Streams → আপনার web stream → Measurement ID (G-XXXX) কপি করুন।")}</li>
                <li>{t("On the same stream page → Measurement Protocol API secrets → Create → copy the secret. Paste all three below.", "একই stream পেজে → Measurement Protocol API secrets → Create → secret কপি করে নিচে বসান।")}</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {widgets.active_users && (
          <Stat icon={<Users className="w-5 h-5 text-white" />} tone="bg-gradient-to-br from-violet-500 to-violet-600"
            label={t(`Active now (${windowMin}m)`, `এখন সক্রিয় (${windowMin}মি)`)} value={activeUsers} />
        )}
        {widgets.orders && (
          <Stat icon={<ShoppingBag className="w-5 h-5 text-white" />} tone="bg-gradient-to-br from-blue-500 to-indigo-600"
            label={t("Orders (24h)", "অর্ডার (২৪ঘ)")} value={rt?.orders24h.length ?? 0}
            sub={widgets.revenue ? `৳ ${rev24}` : undefined} />
        )}
        {widgets.tickets && (
          <Stat icon={<MessageSquare className="w-5 h-5 text-white" />} tone="bg-gradient-to-br from-purple-500 to-pink-500"
            label={t("New tickets (24h)", "নতুন টিকিট (২৪ঘ)")} value={rt?.tickets.length ?? 0} />
        )}
        {widgets.subscribers && (
          <Stat icon={<Mail className="w-5 h-5 text-white" />} tone="bg-gradient-to-br from-amber-500 to-orange-500"
            label={t("New subs (24h)", "নতুন সাব (২৪ঘ)")} value={rt?.subs.length ?? 0} />
        )}
      </div>

      {/* Realtime location + pages from first-party analytics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            {t("Top countries — live", "শীর্ষ দেশ — লাইভ")}
          </h2>
          {topCountries.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No active visitors right now", "এই মুহূর্তে কোনো সক্রিয় ভিজিটর নেই")}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {topCountries.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 grid place-items-center text-[10px] font-black text-slate-600">{c.count}</div>
                  <div className="flex-1 text-sm font-bold text-slate-900 truncate">{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-fuchsia-600" />
            {t("Top pages — live", "শীর্ষ পেজ — লাইভ")}
          </h2>
          {topPages.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No page views yet", "এখনো কোনো পেজভিউ নেই")}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {topPages.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 grid place-items-center text-[10px] font-black text-slate-600">{p.count}</div>
                  <div className="flex-1 text-xs font-semibold text-slate-700 truncate font-mono">{p.path}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live event stream */}
      <div className="grid lg:grid-cols-2 gap-4">
        {widgets.orders && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-violet-600" />
              {t(`Live Orders (last ${windowMin} min)`, `লাইভ অর্ডার (গত ${windowMin} মিনিট)`)}
            </h2>
            {(rt?.ordersRecent.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">{t("No orders", "কোনো অর্ডার নেই")}</div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {rt!.ordersRecent.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{o.full_name || o.email || "—"}</div>
                      <div className="text-[11px] font-semibold text-slate-500">{timeAgo(o.created_at, t)} · {o.status || "—"}</div>
                    </div>
                    <div className="text-sm font-black text-violet-600 tabular-nums">৳ {Math.round(Number(o.total || 0)).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {widgets.chat && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              {t("Live Chat / Tickets", "লাইভ চ্যাট / টিকিট")}
            </h2>
            {(rt?.chat.length ?? 0) + (rt?.tickets.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">{t("Nothing new", "নতুন কিছু নেই")}</div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {(rt?.tickets ?? []).map((t2) => (
                  <div key={`t-${t2.id}`} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-black uppercase">Ticket</span>
                      <span className="text-sm font-bold text-slate-900 truncate">{t2.subject || "—"}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{t2.status} · {timeAgo(t2.created_at, t)}</div>
                  </div>
                ))}
                {(rt?.chat ?? []).map((m) => (
                  <div key={`c-${m.id}`} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase">{m.role}</span>
                      <span className="text-sm text-slate-900 truncate">{m.content}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{timeAgo(m.created_at, t)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {widgets.reviews && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600" />
              {t("Recent Reviews (24h)", "সাম্প্রতিক রিভিউ (২৪ঘ)")}
            </h2>
            {(rt?.reviews.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">{t("No reviews", "কোনো রিভিউ নেই")}</div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {rt!.reviews.map((r) => (
                  <div key={r.id} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-xs font-black">{"★".repeat(r.rating || 0)}</span>
                      <span className="text-sm font-bold text-slate-900 truncate">{r.reviewer_name || "—"}</span>
                      <span className="text-[11px] font-semibold text-slate-500">· {r.product_slug}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{r.comment}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{timeAgo(r.created_at, t)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {widgets.subscribers && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              {t("New Subscribers (24h)", "নতুন সাবস্ক্রাইবার (২৪ঘ)")}
            </h2>
            {(rt?.subs.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">{t("None", "কেউ নেই")}</div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {rt!.subs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="text-sm font-bold text-slate-900 truncate">{s.email}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{timeAgo(s.created_at, t)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ GA4 CONNECTION ═══════ */}
      <Accordion
        title={t("GA4 Connection — Property ID, Measurement ID & API Secret", "GA4 কানেকশন — Property ID, Measurement ID ও API Secret")}
        icon={<Settings />} defaultOpen={!isConfigured}
        badge={isConfigured ? <span className="text-[10px] font-black text-emerald-600 uppercase mr-2">Ready</span> : <span className="text-[10px] font-black text-amber-600 uppercase mr-2">Setup</span>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label={t("GA4 Property ID", "GA4 Property ID")} required
            error={errPid}
            tip={
              <>
                <b>{t("What:", "কী:")}</b> {t("Numeric ID of your GA4 property.", "আপনার GA4 property-র সংখ্যা ID।")}<br />
                <b>{t("Where:", "কোথায়:")}</b> analytics.google.com → Admin → Property Settings → Property ID.<br />
                <b>{t("Example:", "উদাহরণ:")}</b> <code>493829188</code><br />
                <b>{t("Rules:", "নিয়ম:")}</b> {t("6–15 digits, no G- prefix, no spaces.", "৬–১৫ সংখ্যা, G- নেই।")}<br />
                <b>{t("Common error:", "সাধারণ ভুল:")}</b> {t("Pasting the Measurement ID (G-…) here — that's the next field.", "এখানে Measurement ID (G-…) বসানো — সেটা পরের ফিল্ড।")}
              </>
            }
          >
            <input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="493829188"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </Field>

          <Field
            label={t("Measurement ID", "Measurement ID")} required
            error={errMid}
            tip={
              <>
                <b>{t("What:", "কী:")}</b> {t("Web stream ID starting with G-.", "G- দিয়ে শুরু হওয়া web stream ID।")}<br />
                <b>{t("Where:", "কোথায়:")}</b> Admin → Data Streams → {t("your web stream (top right).", "আপনার web stream (উপরে ডানে)।")}<br />
                <b>{t("Example:", "উদাহরণ:")}</b> <code>G-A1B2C3D4E5</code><br />
                <b>{t("Common error:", "সাধারণ ভুল:")}</b> {t("Using the old UA-XXXX id — GA4 only accepts G-.", "পুরনো UA-XXXX আইডি — GA4 শুধু G- নেয়।")}
              </>
            }
          >
            <input value={measurementId} onChange={(e) => setMeasurementId(e.target.value.toUpperCase())} placeholder="G-XXXXXXXXXX"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </Field>

          <Field
            label={t("Measurement Protocol API Secret", "Measurement Protocol API Secret")} required
            error={errSecret}
            tip={
              <>
                <b>{t("What:", "কী:")}</b> {t("Server-side key that lets your site send events to GA4.", "সার্ভার-সাইড key যা GA4-তে ইভেন্ট পাঠাতে দেয়।")}<br />
                <b>{t("Where:", "কোথায়:")}</b> Admin → Data Streams → {t("your web stream", "আপনার web stream")} → Measurement Protocol API secrets → Create.<br />
                <b>{t("Example:", "উদাহরণ:")}</b> <code>Xy3aBc9zQ_kL0mNoPqR</code><br />
                <b>{t("Common error:", "সাধারণ ভুল:")}</b> {t("Deleting the secret in GA4 — events silently stop. Recreate and paste again.", "GA4-এ secret মুছে ফেলা — ইভেন্ট বন্ধ হয়ে যাবে। আবার তৈরি করে বসান।")}
              </>
            }
          >
            <div className="flex gap-2">
              <input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} type={showSecret ? "text" : "password"} placeholder="•••••••••••••"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="button" onClick={() => setShowSecret((v) => !v)}
                className="w-10 grid place-items-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <div className="flex items-end">
            <button
              onClick={onTest} disabled={testing || !measurementId || !apiSecret}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-black hover:bg-slate-800 disabled:opacity-50"
            >
              <PlayCircle className={`w-4 h-4 ${testing ? "animate-pulse" : ""}`} />
              {testing ? t("Testing…", "পরীক্ষা হচ্ছে…") : t("Test Connection", "কানেকশন টেস্ট")}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs font-semibold flex items-start gap-2 ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.msg}</span>
          </div>
        )}
      </Accordion>

      {/* ═══════ CUSTOMIZATION ═══════ */}
      <Accordion title={t("Customize Dashboard", "ড্যাশবোর্ড কাস্টমাইজ")} icon={<Sparkles />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label={t("Auto-refresh (seconds)", "অটো-রিফ্রেশ (সেকেন্ড)")}
            tip={t("How often live widgets fetch new data. 5–300s. Low values cost more DB reads.", "কত সেকেন্ডে ডেটা রিফ্রেশ হবে। ৫–৩০০ সে। কম মান = বেশি DB রিড।")}
          >
            <input type="number" min={5} max={300} value={refresh}
              onChange={(e) => setRefresh(Math.max(5, Math.min(300, Number(e.target.value) || 15)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </Field>
          <Field
            label={t("Active window (minutes)", "সক্রিয় উইন্ডো (মিনিট)")}
            tip={t("A visitor is 'active' if they had activity within this window. GA4 uses 30m by default.", "এই সময়ের মধ্যে অ্যাক্টিভিটি থাকলে ভিজিটর 'সক্রিয়'। GA4-এ ডিফল্ট ৩০ মিনিট।")}
          >
            <input type="number" min={1} max={720} value={windowMin}
              onChange={(e) => setWindowMin(Math.max(1, Math.min(720, Number(e.target.value) || 30)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </Field>
          <Field
            label={t("Low-stock threshold", "কম-স্টক থ্রেশহোল্ড")}
            tip={t("Products with stock at or below this number trigger 'low stock' alerts elsewhere in admin.", "এই মান বা কম স্টক হলে অ্যাডমিনে সতর্কতা।")}
          >
            <input type="number" min={0} max={1000} value={lowStock}
              onChange={(e) => setLowStock(Math.max(0, Math.min(1000, Number(e.target.value) || 5)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </Field>
        </div>

        <div className="mt-5">
          <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            {t("Widgets to show", "যে উইজেট দেখানো হবে")} <HelpTip>{t("Toggle any widget on/off. Turning off means it won't render on this page.", "উইজেট চালু/বন্ধ করুন। বন্ধ থাকলে এই পেজে দেখাবে না।")}</HelpTip>
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <Toggle checked={widgets.active_users} onChange={(v) => setWidgets({ ...widgets, active_users: v })} label={t("Active users", "সক্রিয় ইউজার")} sub={t("Live visitor count", "লাইভ ভিজিটর সংখ্যা")} />
            <Toggle checked={widgets.orders} onChange={(v) => setWidgets({ ...widgets, orders: v })} label={t("Orders", "অর্ডার")} sub={t("24h count + live list", "২৪ঘ কাউন্ট + লাইভ লিস্ট")} />
            <Toggle checked={widgets.revenue} onChange={(v) => setWidgets({ ...widgets, revenue: v })} label={t("Revenue (24h)", "রেভিনিউ (২৪ঘ)")} sub={t("Under Orders card", "অর্ডার কার্ডের নিচে")} />
            <Toggle checked={widgets.tickets} onChange={(v) => setWidgets({ ...widgets, tickets: v })} label={t("Support tickets", "সাপোর্ট টিকিট")} />
            <Toggle checked={widgets.reviews} onChange={(v) => setWidgets({ ...widgets, reviews: v })} label={t("Reviews", "রিভিউ")} />
            <Toggle checked={widgets.subscribers} onChange={(v) => setWidgets({ ...widgets, subscribers: v })} label={t("Newsletter subs", "নিউজলেটার সাব")} />
            <Toggle checked={widgets.chat} onChange={(v) => setWidgets({ ...widgets, chat: v })} label={t("Live chat", "লাইভ চ্যাট")} />
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wide mb-2">{t("Notifications", "নোটিফিকেশন")}</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            <Toggle checked={alertOrder} onChange={setAlertOrder} label={t("Alert on new order", "নতুন অর্ডারে সতর্কতা")} sub={t("Toast + optional sound", "টোস্ট + শব্দ")} />
            <Toggle checked={alertTicket} onChange={setAlertTicket} label={t("Alert on new ticket", "নতুন টিকিটে সতর্কতা")} />
          </div>
        </div>
      </Accordion>

      {/* ═══════ DOCUMENTATION ═══════ */}
      <Accordion title={t("Documentation — Where to find what & how to fix errors", "ডকুমেন্টেশন — কোথায় কী পাবেন ও ভুল ঠিক করার উপায়")} icon={<BookOpen />}>
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 flex gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              {t(
                "This page shows realtime activity from your Rama Sub store (orders, tickets, chat, reviews) PLUS live traffic from the first-party analytics tracker. When GA4 is configured, tracker events are also forwarded to Google Analytics.",
                "এই পেজ Rama Sub স্টোরের রিয়েলটাইম অ্যাক্টিভিটি (অর্ডার, টিকিট, চ্যাট, রিভিউ) + ফার্স্ট-পার্টি ট্র্যাকার থেকে লাইভ ট্রাফিক দেখায়। GA4 কনফিগার থাকলে ইভেন্ট Google Analytics-এও পাঠায়।"
              )}
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1.5">1. {t("Property ID", "Property ID")}</h4>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li><b>{t("Where:", "কোথায়:")}</b> analytics.google.com → Admin (⚙) → Property Settings → <b>Property ID</b> {t("(right side)", "(ডান পাশে)")}.</li>
              <li><b>{t("Example:", "উদাহরণ:")}</b> <code className="bg-slate-100 px-1.5 rounded">493829188</code></li>
              <li><b>{t("Rules:", "নিয়ম:")}</b> 6–15 {t("digits, numeric only", "সংখ্যা, কেবল সংখ্যা")}.</li>
              <li><b>{t("Error", "ভুল")}:</b> "Property ID must be digits" → {t("you pasted G-… — that goes in field 2.", "আপনি G-… বসিয়েছেন — সেটা ২ নম্বর ফিল্ডে।")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1.5">2. {t("Measurement ID", "Measurement ID")}</h4>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li><b>{t("Where:", "কোথায়:")}</b> Admin → <b>Data Streams</b> → {t("click your web stream", "web stream-এ ক্লিক করুন")} → <b>Measurement ID</b> {t("(top right)", "(উপরে ডানে)")}.</li>
              <li><b>{t("Example:", "উদাহরণ:")}</b> <code className="bg-slate-100 px-1.5 rounded">G-A1B2C3D4E5</code></li>
              <li><b>{t("Rules:", "নিয়ম:")}</b> {t("starts with", "শুরু হয়")} <code>G-</code>, 8–17 {t("chars total", "অক্ষর মোট")}.</li>
              <li><b>{t("Error", "ভুল")}:</b> "Format G-…" → {t("check for extra spaces or wrong stream (Android/iOS).", "অতিরিক্ত স্পেস বা ভুল stream (Android/iOS) চেক করুন।")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1.5">3. {t("API Secret", "API Secret")}</h4>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li><b>{t("Where:", "কোথায়:")}</b> Admin → Data Streams → {t("your stream", "আপনার stream")} → <b>Measurement Protocol API secrets</b> → <b>Create</b> → {t("name it 'Rama Sub Web'.", "'Rama Sub Web' নাম দিন।")}</li>
              <li><b>{t("Example:", "উদাহরণ:")}</b> <code className="bg-slate-100 px-1.5 rounded">Xy3aBc9zQ_kL0mNoPqR</code></li>
              <li><b>{t("Warning:", "সতর্কতা:")}</b> {t("GA4 shows the secret only once — copy immediately.", "GA4 secret শুধু একবার দেখায় — সাথে সাথে কপি করুন।")}</li>
              <li><b>{t("Test:", "টেস্ট:")}</b> {t("click 'Test Connection' above — a green success means GA4 accepted your credentials.", "উপরের 'Test Connection'-এ ক্লিক করুন — সবুজ মানে GA4 গ্রহণ করেছে।")}</li>
              <li><b>{t("Error", "ভুল")}:</b> "Unauthorized / secret_invalid" → {t("secret deleted or wrong stream — recreate.", "secret মুছে গেছে বা ভুল stream — আবার তৈরি করুন।")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1.5">4. {t("Where do I see traffic from countries, sources, pages?", "দেশ, সোর্স, পেজ থেকে ট্রাফিক কোথায় দেখব?")}</h4>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li>{t("Full historical breakdown: ", "সম্পূর্ণ ইতিহাস: ")}<b>{t("Admin → Analytics Dashboard", "অ্যাডমিন → Analytics Dashboard")}</b>.</li>
              <li>{t("Live (right now): the two 'live' cards on this page — Top Countries and Top Pages.", "লাইভ (এই মুহূর্তে): এই পেজের উপরের দুটি 'লাইভ' কার্ড — Top Countries ও Top Pages।")}</li>
              <li>{t("On google.com/analytics: Reports → Realtime.", "google.com/analytics-এ: Reports → Realtime।")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1.5">5. {t("Common problems", "সাধারণ সমস্যা")}</h4>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li><b>{t("Nothing shows up in GA4 realtime.", "GA4 realtime-এ কিছু আসছে না।")}</b> {t("Check Test Connection first. If OK, wait 60s and open a page on your site in an incognito window.", "প্রথমে Test Connection চেক করুন। OK হলে ৬০ সে অপেক্ষা করে incognito-তে সাইট খুলুন।")}</li>
              <li><b>{t("Active users = 0.", "সক্রিয় ইউজার = ০।")}</b> {t("Nobody has visited in the active window. Increase the window or share your site URL.", "সক্রিয় উইন্ডোতে কেউ ভিজিট করেনি। উইন্ডো বাড়ান বা URL শেয়ার করুন।")}</li>
              <li><b>{t("Widget missing.", "উইজেট নেই।")}</b> {t("Open 'Customize Dashboard' and turn it back on.", "'Customize Dashboard' খুলে চালু করুন।")}</li>
              <li><b>{t("Refresh feels slow.", "রিফ্রেশ ধীরে হচ্ছে।")}</b> {t("Lower 'Auto-refresh seconds' — but no lower than 5.", "'Auto-refresh seconds' কমান — কিন্তু ৫-এর নিচে নয়।")}</li>
            </ul>
          </div>

          {isConfigured && (
            <div className="rounded-xl bg-slate-900 text-slate-100 p-3 text-xs">
              <div className="font-black mb-1.5 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> {t("Your active config", "আপনার সক্রিয় কনফিগ")}</div>
              <div className="space-y-1 font-mono">
                <div className="flex items-center gap-2">Property ID: <code className="bg-slate-800 px-1.5 rounded">{propertyId}</code>
                  <button onClick={() => copy(propertyId)} className="text-slate-400 hover:text-white"><Copy className="w-3 h-3" /></button>
                </div>
                <div className="flex items-center gap-2">Measurement ID: <code className="bg-slate-800 px-1.5 rounded">{measurementId}</code>
                  <button onClick={() => copy(measurementId)} className="text-slate-400 hover:text-white"><Copy className="w-3 h-3" /></button>
                </div>
                <div>API Secret: <code className="bg-slate-800 px-1.5 rounded">•••••••••••{apiSecret.slice(-4)}</code></div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <a href="https://analytics.google.com/analytics/web/#/admin" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
              {t("Open GA4 Admin", "GA4 অ্যাডমিন খুলুন")} <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://support.google.com/analytics/answer/9539598" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
              {t("GA4 Realtime docs", "GA4 Realtime ডকস")} <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://developers.google.com/analytics/devguides/collection/protocol/ga4" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
              {t("Measurement Protocol docs", "Measurement Protocol ডকস")} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </Accordion>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <div className="rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-xl px-4 py-2.5 flex items-center gap-3">
          <div className="text-[11px] font-bold text-slate-500">
            {isConfigured ? t("All settings valid", "সব সেটিংস ঠিক") : t("Finish setup to save", "সেভ করতে সেটআপ শেষ করুন")}
          </div>
          <button
            onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 text-sm font-black hover:opacity-90 shadow disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t("Saving…", "সেভ হচ্ছে…") : t("Save settings", "সেভ করুন")}
          </button>
        </div>
      </div>
    </div>
  );
}
