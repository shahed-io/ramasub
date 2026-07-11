import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

async function gwFetch(path: string, init: RequestInit = {}) {
  const lovable = process.env.LOVABLE_API_KEY;
  const gsc = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovable || !gsc) {
    throw new Error("Google Search Console connector নেই — Admin panel এ connect করুন");
  }
  const headers = new Headers(init.headers as HeadersInit);
  headers.set("Authorization", `Bearer ${lovable}`);
  headers.set("X-Connection-Api-Key", gsc);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[GSC] ${res.status} ${path}: ${text}`);
    throw new Error(`GSC ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

/** List all verified sites for the connected account. */
export const listSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const data = await gwFetch("/webmasters/v3/sites");
    return { sites: (data.siteEntry ?? []) as Array<{ siteUrl: string; permissionLevel: string }> };
  });

/** Search analytics (clicks/impressions/CTR/position). */
type FilterOp = "equals" | "notEquals" | "contains" | "notContains";
type Filter = { dimension: string; operator: FilterOp; expression: string };

export const searchAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    siteUrl: string; startDate: string; endDate: string;
    dimensions?: string[]; rowLimit?: number; searchType?: string;
    filters?: Filter[];
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/searchAnalytics/query`;
    const body: any = {
      startDate: data.startDate,
      endDate: data.endDate,
      dimensions: data.dimensions ?? [],
      rowLimit: Math.min(Math.max(data.rowLimit ?? 25, 1), 1000),
      searchType: data.searchType ?? "web",
    };
    if (data.filters && data.filters.length) {
      body.dimensionFilterGroups = [{ filters: data.filters }];
    }
    const result = await gwFetch(path, { method: "POST", body: JSON.stringify(body) });
    return { rows: (result.rows ?? []) as Array<any> };
  });

/** List submitted sitemaps for a site. */
export const listSitemaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteUrl: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps`;
    const result = await gwFetch(path);
    return { sitemaps: (result.sitemap ?? []) as Array<any> };
  });

/** Submit (or resubmit) a sitemap. */
export const submitSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteUrl: string; feedpath: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`;
    await gwFetch(path, { method: "PUT" });
    return { ok: true };
  });

/** Delete a submitted sitemap. */
export const deleteSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteUrl: string; feedpath: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`;
    await gwFetch(path, { method: "DELETE" });
    return { ok: true };
  });

/** Inspect a single URL's indexing state. */
export const inspectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteUrl: string; inspectionUrl: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const result = await gwFetch("/v1/urlInspection/index:inspect", {
      method: "POST",
      body: JSON.stringify({ inspectionUrl: data.inspectionUrl, siteUrl: data.siteUrl }),
    });
    return result;
  });

/** Quick connector health check — returns whether env vars are present + tries /sites. */
export const gscHealthCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const hasKey = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_API_KEY && process.env.LOVABLE_API_KEY);
    if (!hasKey) return { connected: false, siteCount: 0 };
    try {
      const data = await gwFetch("/webmasters/v3/sites");
      return { connected: true, siteCount: (data.siteEntry ?? []).length };
    } catch (e) {
      return { connected: false, error: e instanceof Error ? e.message : String(e), siteCount: 0 };
    }
  });
