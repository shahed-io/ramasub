import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Users,
  ShoppingBag,
  MessageSquare,
  Star,
  Mail,
  Save,
  RefreshCw,
  Radio,
  ExternalLink,
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

type GA4Config = { property_id?: string; api_secret?: string };

const REFRESH_MS = 15_000;

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
  const { data } = await supabase
    .from("admin_records")
    .select("data")
    .eq("kind", "ga4_realtime")
    .maybeSingle();
  return ((data?.data as GA4Config) ?? {}) as GA4Config;
}

async function saveConfig(cfg: GA4Config) {
  const { data: existing } = await supabase
    .from("admin_records")
    .select("id")
    .eq("kind", "ga4_realtime")
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("admin_records")
      .update({ data: cfg, is_active: true })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("admin_records")
      .insert({ kind: "ga4_realtime", data: cfg, is_active: true, sort_order: 0 });
    if (error) throw error;
  }
}

async function fetchRealtime() {
  const now = new Date();
  const min30 = new Date(now.getTime() - 30 * 60_000).toISOString();
  const hour24 = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const [orders30, orders24h, tickets, reviews, subs, chat] = await Promise.all([
    supabase.from("orders").select("id,email,full_name,total,status,created_at,items").gte("created_at", min30).order("created_at", { ascending: false }),
    supabase.from("orders").select("id,total,status,created_at").gte("created_at", hour24).order("created_at", { ascending: false }),
    supabase.from("support_tickets").select("id,subject,status,created_at,user_id").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("product_reviews").select("id,rating,comment,created_at,reviewer_name,product_slug").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("newsletter_subscribers").select("id,email,created_at").gte("created_at", hour24).order("created_at", { ascending: false }).limit(10),
    supabase.from("live_chat_messages").select("id,content,created_at,role").gte("created_at", min30).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    ordersRecent: orders30.data ?? [],
    orders24h: orders24h.data ?? [],
    tickets: tickets.data ?? [],
    reviews: reviews.data ?? [],
    subs: subs.data ?? [],
    chat: chat.data ?? [],
  };
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

function GA4RealtimePage() {
  const { t } = useAdminLang();
  const [propertyId, setPropertyId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);

  const { data: cfg } = useQuery({ queryKey: ["ga4-realtime-config"], queryFn: fetchConfig, staleTime: 60_000 });

  useEffect(() => {
    if (cfg) {
      setPropertyId(cfg.property_id ?? "");
      setApiSecret(cfg.api_secret ?? "");
    }
  }, [cfg]);

  const { data: rt, isFetching, refetch } = useQuery({
    queryKey: ["ga4-realtime-live"],
    queryFn: fetchRealtime,
    refetchInterval: REFRESH_MS,
    staleTime: 5_000,
  });

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const rev24 = useMemo(() => {
    const s = (rt?.orders24h ?? []).reduce((acc, o) => {
      const st = (o.status || "").toLowerCase();
      if (st.includes("cancel") || st.includes("refund") || st.includes("fail")) return acc;
      return acc + Number(o.total || 0);
    }, 0);
    return Math.round(s).toLocaleString("en-IN");
  }, [rt]);

  const activeUsers = useMemo(() => {
    const emails = new Set<string>();
    for (const o of rt?.ordersRecent ?? []) if (o.email) emails.add(o.email);
    for (const m of rt?.chat ?? []) emails.add(`chat:${m.id}`);
    return emails.size;
  }, [rt]);

  async function onSave() {
    setSaving(true);
    try {
      await saveConfig({ property_id: propertyId.trim(), api_secret: apiSecret.trim() });
      toast.success(t("Settings saved", "সেটিংস সেভ হয়েছে"));
    } catch {
      toast.error(t("Could not save", "সেভ করা যায়নি"));
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                {t("Realtime Activity", "রিয়েলটাইম অ্যাক্টিভিটি")}
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-black uppercase">
                  <Radio className="w-3 h-3" /> Live
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                {t(
                  `Live activity from your website — auto refresh every ${REFRESH_MS / 1000}s`,
                  `আপনার ওয়েবসাইটের লাইভ অ্যাক্টিভিটি — প্রতি ${REFRESH_MS / 1000} সেকেন্ডে অটো রিফ্রেশ`,
                )}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<Users className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-violet-500 to-violet-600"
          label={t("Active now (30m)", "এখন সক্রিয় (৩০মি)")}
          value={activeUsers}
        />
        <Stat
          icon={<ShoppingBag className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-blue-500 to-indigo-600"
          label={t("Orders (24h)", "অর্ডার (২৪ঘ)")}
          value={rt?.orders24h.length ?? 0}
          sub={`৳ ${rev24}`}
        />
        <Stat
          icon={<MessageSquare className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-purple-500 to-pink-500"
          label={t("New tickets (24h)", "নতুন টিকিট (২৪ঘ)")}
          value={rt?.tickets.length ?? 0}
        />
        <Stat
          icon={<Mail className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-amber-500 to-orange-500"
          label={t("New subscribers (24h)", "নতুন সাবস্ক্রাইবার (২৪ঘ)")}
          value={rt?.subs.length ?? 0}
        />
      </div>

      {/* Live event stream */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-violet-600" />
            {t("Live Orders (last 30 min)", "লাইভ অর্ডার (গত ৩০ মিনিট)")}
          </h2>
          {(rt?.ordersRecent.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No orders in the last 30 minutes", "গত ৩০ মিনিটে কোনো অর্ডার নেই")}
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {rt!.ordersRecent.map((o) => (
                <div key={o.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{o.full_name || o.email || "—"}</div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {timeAgo(o.created_at, t)} · {o.status || "—"}
                    </div>
                  </div>
                  <div className="text-sm font-black text-violet-600 tabular-nums">৳ {Math.round(Number(o.total || 0)).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            {t("Live Chat / Tickets", "লাইভ চ্যাট / টিকিট")}
          </h2>
          {(rt?.chat.length ?? 0) + (rt?.tickets.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("Nothing new", "নতুন কিছু নেই")}
            </div>
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

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-600" />
            {t("Recent Reviews (24h)", "সাম্প্রতিক রিভিউ (২৪ঘ)")}
          </h2>
          {(rt?.reviews.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No reviews", "কোনো রিভিউ নেই")}
            </div>
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

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            {t("New Subscribers (24h)", "নতুন সাবস্ক্রাইবার (২৪ঘ)")}
          </h2>
          {(rt?.subs.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No new subscribers", "কোনো নতুন সাবস্ক্রাইবার নেই")}
            </div>
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
      </div>

      {/* GA4 config */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {t("GA4 Configuration", "GA4 কনফিগারেশন")}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 max-w-2xl">
              {t(
                "Optional — save your GA4 Property ID and Measurement Protocol API secret. Used by tracker scripts to forward events to Google Analytics.",
                "ঐচ্ছিক — আপনার GA4 Property ID এবং Measurement Protocol API secret সেভ করুন। ট্র্যাকার স্ক্রিপ্ট এটি ব্যবহার করে Google Analytics-এ ইভেন্ট পাঠায়।",
              )}
            </p>
          </div>
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            {t("Open GA4", "GA4 খুলুন")} <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-[11px] font-black text-slate-600 uppercase tracking-wide mb-1.5">
              {t("GA4 Property ID", "GA4 Property ID")}
            </div>
            <input
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="123456789"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </label>
          <label className="block">
            <div className="text-[11px] font-black text-slate-600 uppercase tracking-wide mb-1.5">
              {t("API Secret", "API Secret")}
            </div>
            <input
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              type="password"
              placeholder="•••••••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
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
