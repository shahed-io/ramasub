import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, Eye, MousePointerClick, Timer, TrendingUp, Globe2, MapPin, Radio,
  Smartphone, Monitor, RefreshCw, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { getWebAnalyticsOverview, getWebAnalyticsLive } from "@/lib/web-analytics.functions";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/analytics")({
  component: WebAnalyticsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Website Analytics — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Range = "24h" | "7d" | "30d" | "90d";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#ec4899", "#3b82f6", "#0ea5e9"];

const FLAGS: Record<string, string> = {
  BD: "🇧🇩", IN: "🇮🇳", PK: "🇵🇰", US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺",
  DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴",
  SA: "🇸🇦", AE: "🇦🇪", QA: "🇶🇦", KW: "🇰🇼", OM: "🇴🇲", BH: "🇧🇭", EG: "🇪🇬",
  JP: "🇯🇵", CN: "🇨🇳", KR: "🇰🇷", SG: "🇸🇬", MY: "🇲🇾", TH: "🇹🇭", VN: "🇻🇳",
  ID: "🇮🇩", PH: "🇵🇭", NP: "🇳🇵", LK: "🇱🇰", TR: "🇹🇷", BR: "🇧🇷", MX: "🇲🇽",
  NG: "🇳🇬", KE: "🇰🇪", ZA: "🇿🇦", RU: "🇷🇺", UA: "🇺🇦",
};

function flag(cc: string | null): string {
  if (!cc) return "🌐";
  return FLAGS[cc.toUpperCase()] || "🌐";
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function KpiCard({
  icon, label, value, tone = "violet",
}: { icon: React.ReactNode; label: string; value: string | number; tone?: string }) {
  const tones: Record<string, string> = {
    violet: "from-blue-500 to-sky-500",
    emerald: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-orange-500",
    sky: "from-sky-500 to-blue-500",
    rose: "from-rose-500 to-pink-500",
    indigo: "from-indigo-500 to-blue-600",
    slate: "from-slate-500 to-slate-700",
  };
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 flex items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${tones[tone]} text-white grid place-items-center shadow-sm [&_svg]:w-5 [&_svg]:h-5`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
        <div className="text-xl font-extrabold text-slate-800 truncate">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TopList({
  rows, prefix, valueLabel,
}: { rows: { key: string; label: string; count: number }[]; prefix?: (k: string) => React.ReactNode; valueLabel?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) {
    return <div className="text-sm text-slate-400 py-8 text-center">কোনো ডেটা নেই</div>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.key} className="relative rounded-lg hover:bg-slate-50 px-2 py-1.5">
          <div
            className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-blue-100 to-sky-100"
            style={{ width: `${(r.count / max) * 100}%` }}
            aria-hidden
          />
          <div className="relative flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 truncate">
              {prefix ? prefix(r.key) : null}
              <span className="truncate text-slate-700">{r.label}</span>
            </span>
            <span className="text-slate-600 font-semibold tabular-nums shrink-0">
              {r.count.toLocaleString("en-US")}
              {valueLabel ? <span className="text-[11px] font-normal text-slate-400 ml-1">{valueLabel}</span> : null}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WebAnalyticsPage() {
  const { t } = useAdminLang();
  const [range, setRange] = useState<Range>("7d");
  const overviewFn = useServerFn(getWebAnalyticsOverview);
  const liveFn = useServerFn(getWebAnalyticsLive);

  const overview = useQuery({
    queryKey: ["web-analytics", range],
    queryFn: () => overviewFn({ data: { range } }),
    refetchInterval: 60_000,
  });

  const live = useQuery({
    queryKey: ["web-analytics-live"],
    queryFn: () => liveFn({ data: undefined as any }),
    refetchInterval: 15_000,
  });

  const data = overview.data;

  const timeSeriesData = useMemo(() => {
    if (!data?.timeSeries) return [];
    return data.timeSeries.map((p) => ({
      label: data.timeSeriesGranularity === "hour"
        ? p.date.slice(11, 16)
        : p.date.slice(5),
      visits: p.visits,
      visitors: p.visitors,
    }));
  }, [data]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-sky-50 p-4 sm:p-5 mb-5">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 w-11 h-11 rounded-xl bg-white shadow-sm ring-1 ring-blue-100 grid place-items-center text-blue-600">
              <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">
                {t("Website Analytics", "ওয়েবসাইট অ্যানালিটিক্স")}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {t("Traffic, countries, sources & pages — real-time from your site", "ট্রাফিক, দেশ, সোর্স ও পেজ — আপনার সাইট থেকে রিয়েল-টাইম")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-emerald-200 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              {live.data?.activeVisitors ?? 0} {t("active now", "এখন অনলাইন")}
            </div>

            <div className="inline-flex rounded-full bg-white ring-1 ring-slate-200 p-0.5 text-xs font-semibold">
              {(["24h", "7d", "30d", "90d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-full transition ${
                    range === r
                      ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r === "24h" ? t("24h", "২৪ঘ") : r === "7d" ? t("7 days", "৭ দিন") : r === "30d" ? t("30 days", "৩০ দিন") : t("90 days", "৯০ দিন")}
                </button>
              ))}
            </div>

            <button
              onClick={() => { overview.refetch(); live.refetch(); }}
              className="w-9 h-9 grid place-items-center rounded-full bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${overview.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {overview.isLoading ? (
        <div className="text-center py-16 text-slate-400">লোড হচ্ছে…</div>
      ) : overview.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">
          {(overview.error as Error)?.message || "লোড ব্যর্থ"}
        </div>
      ) : !data ? null : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard icon={<Users />} label={t("Visitors", "ভিজিটর")} value={data.kpis.visitors.toLocaleString("en-US")} tone="violet" />
            <KpiCard icon={<Eye />} label={t("Pageviews", "পেজভিউ")} value={data.kpis.pageviews.toLocaleString("en-US")} tone="sky" />
            <KpiCard icon={<MousePointerClick />} label={t("Sessions", "সেশন")} value={data.kpis.sessions.toLocaleString("en-US")} tone="emerald" />
            <KpiCard icon={<TrendingUp />} label={t("Pages/Session", "পেজ/সেশন")} value={data.kpis.pageviewsPerSession} tone="amber" />
            <KpiCard icon={<ArrowUpRight />} label={t("New Visitors", "নতুন ভিজিটর")} value={data.kpis.newVisitors.toLocaleString("en-US")} tone="rose" />
            <KpiCard icon={<Timer />} label={t("Avg Duration", "গড় সময়")} value={fmtDuration(data.kpis.avgDurationSec)} tone="indigo" />
            <KpiCard icon={<TrendingUp />} label={t("Bounce Rate", "বাউন্স রেট")} value={`${data.kpis.bounceRate}%`} tone="slate" />
            <KpiCard icon={<Radio />} label={t("Active Now", "এখন অনলাইন")} value={live.data?.activeVisitors ?? 0} tone="emerald" />
          </div>

          {/* Time series */}
          <div className="mb-5">
            <Section title={t("Traffic over time", "সময়ের সাথে ট্রাফিক")}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={11} tick={{ fill: "#64748b" }} />
                    <YAxis fontSize={11} tick={{ fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                    <Legend />
                    <Area type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} fill="url(#gv)" name={t("Visitors", "ভিজিটর")} />
                    <Area type="monotone" dataKey="visits" stroke="#06b6d4" strokeWidth={2} fill="url(#gp)" name={t("Pageviews", "পেজভিউ")} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* Grid: Countries / Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <Section title={t("Top Countries", "শীর্ষ দেশ")} right={<Globe2 className="w-4 h-4 text-slate-400" />}>
              <TopList
                rows={data.topCountries}
                prefix={(k) => <span className="text-lg leading-none">{flag(k)}</span>}
                valueLabel={t("visits", "ভিজিট")}
              />
            </Section>

            <Section title={t("Top Pages", "শীর্ষ পেজ")} right={<Eye className="w-4 h-4 text-slate-400" />}>
              <TopList
                rows={data.topPages.map((r) => ({ ...r, label: r.key }))}
                valueLabel={t("views", "ভিউ")}
              />
            </Section>
          </div>

          {/* Grid: Referrers / Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="lg:col-span-2">
              <Section title={t("Top Referrers", "শীর্ষ রেফারার")}>
                <TopList
                  rows={data.topReferrers.map((r) => ({
                    ...r,
                    label: r.key === "(unknown)" ? t("Direct / None", "ডিরেক্ট / নেই") : r.key,
                  }))}
                  valueLabel={t("visits", "ভিজিট")}
                />
              </Section>
            </div>
            <Section title={t("Channels", "চ্যানেল")}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.channels}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {data.channels.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* Grid: Devices / Browsers / OS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <Section title={t("Devices", "ডিভাইস")} right={<Smartphone className="w-4 h-4 text-slate-400" />}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(e: any) => `${e.label}`}
                    >
                      {data.devices.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title={t("Browsers", "ব্রাউজার")} right={<Monitor className="w-4 h-4 text-slate-400" />}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.browsers} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" fontSize={11} width={70} tick={{ fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title={t("Operating Systems", "অপারেটিং সিস্টেম")}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.oses} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" fontSize={11} width={70} tick={{ fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* Live feed + cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Section
              title={t("Live activity (last 5 min)", "লাইভ অ্যাক্টিভিটি (শেষ ৫ মিনিট)")}
              right={<span className="text-[11px] font-semibold text-blue-700 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> LIVE</span>}
            >
              {(live.data?.recent?.length ?? 0) === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">এই মুহূর্তে কেউ নেই</div>
              ) : (
                <div className="divide-y divide-slate-100 -mx-4 -my-4">
                  {live.data!.recent.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="text-base leading-none">{flag(r.country)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-700">{r.path}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {[r.country_name || r.country, r.city, r.device, r.browser].filter(Boolean).join(" • ")}
                          {r.referrer_host ? ` • ← ${r.referrer_host}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={t("Top Cities", "শীর্ষ শহর")} right={<MapPin className="w-4 h-4 text-slate-400" />}>
              <TopList
                rows={data.topCities.map((r) => ({
                  ...r,
                  label: r.key === "(unknown)" ? t("Unknown", "অজানা") : r.key,
                }))}
                valueLabel={t("visits", "ভিজিট")}
              />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
