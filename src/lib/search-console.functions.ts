import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_SEO_SETTINGS, type SeoSettings } from "@/lib/seo-settings.functions";
import { validator, z, intIn } from "@/lib/validation";

/** GSC property id: "https://example.com/" or "sc-domain:example.com". */
const siteUrl = z
  .string()
  .trim()
  .min(4)
  .max(300)
  .regex(/^(https?:\/\/[^\s"'<>]+|sc-domain:[a-z0-9.-]+)$/i, { message: "Invalid site URL" });

/** Domain or origin the user typed in the verify box. */
const identifier = z
  .string()
  .trim()
  .min(4)
  .max(300)
  .regex(/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}\/?$/i, { message: "Invalid domain" });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" });

const dimension = z.enum(["query", "page", "country", "device", "searchAppearance", "date"]);

const SearchAnalyticsInput = z
  .object({
    siteUrl,
    startDate: isoDate,
    endDate: isoDate,
    dimensions: z.array(dimension).max(4).optional(),
    rowLimit: intIn(1, 1000).optional(),
    searchType: z.enum(["web", "image", "video", "news", "discover", "googleNews"]).optional(),
    filters: z
      .array(
        z
          .object({
            dimension,
            operator: z.enum(["equals", "notEquals", "contains", "notContains"]),
            expression: z.string().trim().min(1).max(300),
          })
          .strict(),
      )
      .max(10)
      .optional(),
  })
  .strict()
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must be on or before endDate",
    path: ["startDate"],
  });

/** Sitemap feed path: absolute URL on the property. */
const feedpath = z.string().trim().min(4).max(500).url();

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(userId);
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
    await assertAdmin(context.userId);
    const data = await gwFetch("/webmasters/v3/sites");
    return { sites: (data.siteEntry ?? []) as Array<{ siteUrl: string; permissionLevel: string }> };
  });

/** Search analytics (clicks/impressions/CTR/position). */
type FilterOp = "equals" | "notEquals" | "contains" | "notContains";
type Filter = { dimension: string; operator: FilterOp; expression: string };

export const searchAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(SearchAnalyticsInput))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
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
  .inputValidator(validator(z.object({ siteUrl }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps`;
    const result = await gwFetch(path);
    return { sitemaps: (result.sitemap ?? []) as Array<any> };
  });

/** Submit (or resubmit) a sitemap. */
export const submitSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(z.object({ siteUrl, feedpath }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`;
    await gwFetch(path, { method: "PUT" });
    return { ok: true };
  });

/** Delete a submitted sitemap. */
export const deleteSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(z.object({ siteUrl, feedpath }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`;
    await gwFetch(path, { method: "DELETE" });
    return { ok: true };
  });

/** Inspect a single URL's indexing state. */
export const inspectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(z.object({ siteUrl, inspectionUrl: z.string().trim().min(4).max(2048).url() }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
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
    await assertAdmin(context.userId);
    const hasKey = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_API_KEY && process.env.LOVABLE_API_KEY);
    if (!hasKey) return { connected: false, siteCount: 0 };
    try {
      const data = await gwFetch("/webmasters/v3/sites");
      return { connected: true, siteCount: (data.siteEntry ?? []).length };
    } catch (e) {
      return { connected: false, error: e instanceof Error ? e.message : String(e), siteCount: 0 };
    }
  });

function normalizeIdentifier(input: string): string {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}/`;
  } catch {
    return s.endsWith("/") ? s : s + "/";
  }
}

/** Read current verification meta (from seo_settings). */
export const getVerificationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_records")
      .select("data")
      .eq("kind", "seo_settings")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const s = (data?.data ?? {}) as Partial<SeoSettings>;
    return { metaToken: s.google_site_verification ?? "" };
  });

/**
 * Step 1 — request a META token from Google for `identifier`, save it into
 * seo_settings so the meta tag renders on the deployed site.
 */
export const startMetaVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(z.object({ identifier }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const identifier = normalizeIdentifier(data.identifier);
    const res = await gwFetch("/siteVerification/v1/token", {
      method: "POST",
      body: JSON.stringify({ site: { identifier, type: "SITE" }, verificationMethod: "META" }),
    });
    // Full <meta ... content="..."> string returned. Extract just the content value.
    const raw: string = res.token ?? "";
    const m = raw.match(/content=["']([^"']+)["']/i);
    const content = m ? m[1] : raw;

    // Persist to seo_settings.google_site_verification (rendered by <SeoHead />)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("admin_records")
      .select("id,data")
      .eq("kind", "seo_settings")
      .limit(1)
      .maybeSingle();
    const stored = ((existing?.data ?? {}) as Partial<SeoSettings>);
    const merged: SeoSettings = { ...DEFAULT_SEO_SETTINGS, ...stored, google_site_verification: content };
    if (existing?.id) {
      await supabaseAdmin.from("admin_records").update({ data: merged as never, is_active: true }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("admin_records").insert({ kind: "seo_settings", data: merged as never, is_active: true });
    }
    return { identifier, token: content, rawTag: raw };
  });

/**
 * Step 2 — ask Google to verify the site. Requires the deployed site to serve
 * the meta tag first. Also auto-adds the site to Search Console on success.
 */
export const completeMetaVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(z.object({ identifier }).strict()))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const identifier = normalizeIdentifier(data.identifier);
    await gwFetch("/siteVerification/v1/webResource?verificationMethod=META", {
      method: "POST",
      body: JSON.stringify({ site: { identifier, type: "SITE" } }),
    });
    // Add to Search Console
    try {
      await gwFetch(`/webmasters/v3/sites/${encodeURIComponent(identifier)}`, { method: "PUT" });
    } catch (e) {
      console.warn("[GSC] verify ok but addSite failed:", e);
    }
    return { ok: true, identifier };
  });

/** List sites that this Google account has already verified (any state). */
export const listVerifiedResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const res = await gwFetch("/siteVerification/v1/webResource");
    return { items: (res.items ?? []) as Array<{ id: string; site: { identifier: string; type: string }; owners?: string[] }> };
  });

