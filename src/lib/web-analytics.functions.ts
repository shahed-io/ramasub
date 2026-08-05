import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validator, z } from "@/lib/validation";


type Range = "24h" | "7d" | "30d" | "90d";

type Row = {
  created_at: string;
  session_id: string;
  visitor_id: string | null;
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  country: string | null;
  country_name: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  is_new_session: boolean | null;
  is_new_visitor: boolean | null;
};

function rangeStart(range: Range): Date {
  const map: Record<Range, number> = {
    "24h": 24 * 3600_000,
    "7d": 7 * 24 * 3600_000,
    "30d": 30 * 24 * 3600_000,
    "90d": 90 * 24 * 3600_000,
  };
  return new Date(Date.now() - map[range]);
}

function bucketByDay(rows: Row[]): { date: string; visits: number; visitors: Set<string> }[] {
  const map = new Map<string, { visits: number; visitors: Set<string> }>();
  for (const r of rows) {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    const cur = map.get(d) || { visits: 0, visitors: new Set() };
    cur.visits += 1;
    if (r.visitor_id) cur.visitors.add(r.visitor_id);
    map.set(d, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, visits: v.visits, visitors: v.visitors }));
}

function bucketByHour(rows: Row[]): { date: string; visits: number; visitors: Set<string> }[] {
  const map = new Map<string, { visits: number; visitors: Set<string> }>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.toISOString().slice(0, 13)}:00`;
    const cur = map.get(key) || { visits: 0, visitors: new Set() };
    cur.visits += 1;
    if (r.visitor_id) cur.visitors.add(r.visitor_id);
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, visits: v.visits, visitors: v.visitors }));
}

function topBy<K extends keyof Row>(rows: Row[], key: K, limit = 10, nameKey?: keyof Row) {
  const counts = new Map<string, { count: number; label: string }>();
  for (const r of rows) {
    const k = (r[key] as string | null) || "(unknown)";
    const cur = counts.get(k) || { count: 0, label: (nameKey ? (r[nameKey] as string | null) : null) || k };
    cur.count += 1;
    if (nameKey && r[nameKey]) cur.label = r[nameKey] as string;
    counts.set(k, cur);
  }
  return Array.from(counts.entries())
    .map(([k, v]) => ({ key: k, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(userId);
}

export const getWebAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    validator(
      z
        .object({ range: z.enum(["24h", "7d", "30d", "90d"]).default("7d") })
        .strict()
        .default({ range: "7d" }),
    ),
  )

  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const since = rangeStart(data.range).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("web_analytics_events")
      .select(
        "created_at, session_id, visitor_id, path, referrer_host, utm_source, country, country_name, city, device, browser, os, is_new_session, is_new_visitor"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(50000);

    if (error) throw new Error(error.message);
    const list = (rows as Row[]) || [];

    // KPIs
    const uniqueVisitors = new Set(list.map((r) => r.visitor_id).filter(Boolean) as string[]);
    const uniqueSessions = new Set(list.map((r) => r.session_id).filter(Boolean));
    const pageviews = list.length;
    const newVisitors = list.filter((r) => r.is_new_visitor).length;

    // sessions grouped for bounce rate + duration
    const bySession = new Map<string, Row[]>();
    for (const r of list) {
      const arr = bySession.get(r.session_id) || [];
      arr.push(r);
      bySession.set(r.session_id, arr);
    }
    let singlePageSessions = 0;
    let totalDurSec = 0;
    let durSessions = 0;
    for (const [, arr] of bySession) {
      if (arr.length === 1) singlePageSessions += 1;
      if (arr.length >= 2) {
        arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
        const dur = (new Date(arr[arr.length - 1].created_at).getTime() - new Date(arr[0].created_at).getTime()) / 1000;
        if (dur > 0 && dur < 3600) {
          totalDurSec += dur;
          durSessions += 1;
        }
      }
    }
    const bounceRate = uniqueSessions.size > 0 ? Math.round((singlePageSessions / uniqueSessions.size) * 100) : 0;
    const avgDuration = durSessions > 0 ? Math.round(totalDurSec / durSessions) : 0;
    const pageviewsPerSession = uniqueSessions.size > 0 ? +(pageviews / uniqueSessions.size).toFixed(2) : 0;

    // time-series
    const useHourly = data.range === "24h";
    const buckets = useHourly ? bucketByHour(list) : bucketByDay(list);
    const timeSeries = buckets.map((b) => ({
      date: b.date,
      visits: b.visits,
      visitors: b.visitors.size,
    }));

    // Top lists
    const topPages = topBy(list, "path", 15);
    const topCountries = topBy(list, "country", 15, "country_name");
    const topReferrers = topBy(list, "referrer_host", 15);
    const topCities = topBy(list, "city", 10);
    const topSources = topBy(list, "utm_source", 10);
    const devices = topBy(list, "device", 5);
    const browsers = topBy(list, "browser", 8);
    const oses = topBy(list, "os", 8);

    // Referrer buckets (Direct vs Search vs Social vs Referral)
    const channelCounts: Record<string, number> = { Direct: 0, Search: 0, Social: 0, Referral: 0 };
    const searchHosts = /google\.|bing\.|yahoo\.|duckduckgo\.|yandex\./i;
    const socialHosts = /facebook\.|fb\.|instagram\.|t\.co|twitter\.|x\.com|linkedin\.|youtube\.|tiktok\.|pinterest\.|reddit\.|whatsapp\.|telegram\./i;
    for (const r of list) {
      const host = r.referrer_host;
      if (!host) channelCounts.Direct += 1;
      else if (searchHosts.test(host)) channelCounts.Search += 1;
      else if (socialHosts.test(host)) channelCounts.Social += 1;
      else channelCounts.Referral += 1;
    }
    const channels = Object.entries(channelCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      range: data.range,
      generatedAt: new Date().toISOString(),
      kpis: {
        visitors: uniqueVisitors.size,
        sessions: uniqueSessions.size,
        pageviews,
        newVisitors,
        bounceRate,
        avgDurationSec: avgDuration,
        pageviewsPerSession,
      },
      timeSeries,
      timeSeriesGranularity: useHourly ? "hour" : "day",
      topPages,
      topCountries,
      topReferrers,
      topCities,
      topSources,
      devices,
      browsers,
      oses,
      channels,
    };
  });

export const getWebAnalyticsLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("web_analytics_events")
      .select("created_at, path, country, country_name, city, device, browser, referrer_host, visitor_id, session_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data || [];
    const activeVisitors = new Set(rows.map((r: any) => r.visitor_id).filter(Boolean)).size;
    return { activeVisitors, recent: rows.slice(0, 30) };
  });
