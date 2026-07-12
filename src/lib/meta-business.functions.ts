// Server functions for Meta Business Integration.
// All functions require admin role.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type AdminCtx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }; userId: string };
async function assertAdmin(context: AdminCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden: admin required");
}


// ============ getMetaConfig ============
export const getMetaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("meta_business_config")
      .select("id, pixel_id, dataset_id, access_token_last4, test_event_code, graph_api_version, enable_pixel, auto_inject, load_in_head, load_after_consent, advanced_matching, auto_pageview, spa_nav, wc_detect, debug_mode, capi_enabled, capi_endpoint, capi_timeout_ms, capi_max_retry, capi_retry_failed, capi_queue_failed, consent_gdpr, consent_ccpa, consent_region_detect, last_verified_at, last_verify_result, last_event_at, event_match_quality, updated_at")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { config: data };
  });

// ============ saveMetaConfig ============
const saveSchema = z.object({
  pixel_id: z.string().trim().max(64).nullable().optional(),
  dataset_id: z.string().trim().max(64).nullable().optional(),
  access_token: z.string().trim().max(1024).nullable().optional(), // plaintext; encrypt server-side
  clear_token: z.boolean().optional(),
  test_event_code: z.string().trim().max(64).nullable().optional(),
  graph_api_version: z.string().trim().max(16).optional(),
  enable_pixel: z.boolean().optional(),
  auto_inject: z.boolean().optional(),
  load_in_head: z.boolean().optional(),
  load_after_consent: z.boolean().optional(),
  advanced_matching: z.boolean().optional(),
  auto_pageview: z.boolean().optional(),
  spa_nav: z.boolean().optional(),
  wc_detect: z.boolean().optional(),
  debug_mode: z.boolean().optional(),
  capi_enabled: z.boolean().optional(),
  capi_endpoint: z.string().trim().max(512).nullable().optional(),
  capi_timeout_ms: z.number().int().min(1000).max(60000).optional(),
  capi_max_retry: z.number().int().min(0).max(10).optional(),
  capi_retry_failed: z.boolean().optional(),
  capi_queue_failed: z.boolean().optional(),
  consent_gdpr: z.boolean().optional(),
  consent_ccpa: z.boolean().optional(),
  consent_region_detect: z.boolean().optional(),
});

export const saveMetaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptToken } = await import("./meta-business.server");

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k === "access_token" || k === "clear_token") continue;
      if (v !== undefined) update[k] = v;
    }
    if (data.clear_token) {
      update.access_token_encrypted = null;
      update.access_token_last4 = null;
    } else if (data.access_token && data.access_token.length >= 10) {
      const { ciphertext, last4 } = encryptToken(data.access_token);
      update.access_token_encrypted = ciphertext;
      update.access_token_last4 = last4;
    }

    const { error } = await supabaseAdmin
      .from("meta_business_config")
      .update(update as never)
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ verifyMetaConnection ============
export const verifyMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptToken, pixelInfoUrl } = await import("./meta-business.server");

    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("meta_business_config")
      .select("pixel_id, dataset_id, access_token_encrypted, graph_api_version")
      .eq("singleton", true)
      .maybeSingle();
    if (cfgErr) throw new Error(cfgErr.message);

    const checks: Record<string, { ok: boolean; msg: string }> = {
      pixel_id: { ok: !!cfg?.pixel_id, msg: cfg?.pixel_id ? "Pixel ID configured" : "Pixel ID missing" },
      dataset_id: { ok: !!cfg?.dataset_id, msg: cfg?.dataset_id ? "Dataset ID configured" : "Dataset ID missing" },
      access_token: { ok: !!cfg?.access_token_encrypted, msg: cfg?.access_token_encrypted ? "Access token stored" : "Access token missing" },
    };

    let graph_ok = false;
    let graph_msg = "Skipped (missing pixel or token)";
    let pixel_name: string | null = null;

    if (cfg?.pixel_id && cfg?.access_token_encrypted) {
      try {
        const tokenBuf = cfg.access_token_encrypted as unknown as string;
        // Supabase returns bytea as \x-hex string via JS client; convert
        const buf = typeof tokenBuf === "string" && tokenBuf.startsWith("\\x")
          ? Buffer.from(tokenBuf.slice(2), "hex")
          : Buffer.from(tokenBuf as unknown as ArrayBuffer);
        const token = decryptToken(buf);
        const url = pixelInfoUrl(cfg.pixel_id, cfg.graph_api_version || "v21.0", token);
        const res = await fetch(url);
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.id) {
          graph_ok = true;
          pixel_name = body.name || null;
          graph_msg = `Verified: ${body.name || body.id}`;
        } else {
          graph_msg = body?.error?.message || `HTTP ${res.status}`;
        }
      } catch (ex) {
        graph_msg = ex instanceof Error ? ex.message : "Decrypt/fetch failed";
      }
    }

    const result = { checks, graph: { ok: graph_ok, msg: graph_msg, pixel_name }, at: new Date().toISOString() };
    await supabaseAdmin.from("meta_business_config").update({
      last_verified_at: new Date().toISOString(),
      last_verify_result: result,
    }).eq("singleton", true);

    return result;
  });

// ============ sendMetaTestEvent ============
const testSchema = z.object({
  event_name: z.enum(["PageView", "Purchase", "Lead", "ViewContent", "Search"]).default("PageView"),
});

export const sendMetaTestEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => testSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptToken, metaGraphUrl } = await import("./meta-business.server");

    const { data: cfg } = await supabaseAdmin
      .from("meta_business_config")
      .select("pixel_id, access_token_encrypted, test_event_code, graph_api_version")
      .eq("singleton", true)
      .maybeSingle();

    if (!cfg?.pixel_id || !cfg?.access_token_encrypted) {
      throw new Error("Pixel ID এবং Access Token আগে save করুন।");
    }
    const tokenRaw = cfg.access_token_encrypted as unknown as string;
    const buf = typeof tokenRaw === "string" && tokenRaw.startsWith("\\x")
      ? Buffer.from(tokenRaw.slice(2), "hex")
      : Buffer.from(tokenRaw as unknown as ArrayBuffer);
    const token = decryptToken(buf);

    const eventId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const t0 = Date.now();
    const url = metaGraphUrl(cfg.pixel_id, cfg.graph_api_version || "v21.0");
    const body: Record<string, unknown> = {
      data: [{
        event_name: data.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://ramasub.com/",
        user_data: {},
      }],
      access_token: token,
    };
    if (cfg.test_event_code) body.test_event_code = cfg.test_event_code;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const respBody = await res.json().catch(() => ({}));
    const latency = Date.now() - t0;

    await supabaseAdmin.from("meta_event_logs").insert({
      event_name: data.event_name,
      channel: "server",
      status: res.ok ? "success" : "failed",
      http_code: res.status,
      latency_ms: latency,
      response: respBody,
      event_id: eventId,
    });
    await supabaseAdmin.from("meta_business_config").update({
      last_event_at: new Date().toISOString(),
    }).eq("singleton", true);

    if (!res.ok) throw new Error(respBody?.error?.message || `Meta API HTTP ${res.status}`);
    return { ok: true, http: res.status, latency_ms: latency, response: respBody, event_id: eventId };
  });

// ============ listMetaEventLogs ============
export const listMetaEventLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("meta_event_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { logs: data || [] };
  });
