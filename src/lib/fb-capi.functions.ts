import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

/**
 * Sends a server-side conversion event to Meta's Conversions API.
 * Requires FB_CAPI_ACCESS_TOKEN secret + a tracking_pixels row of
 * provider='facebook_pixel' with pixel_id set.
 *
 * Optionally, a fb_audience row holds a separate access_token override
 * (useful when Custom Audiences uses a different system user token).
 */

const hash = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

type SyncResult = {
  ok: boolean;
  sent: number;
  events_received?: number;
  fbtrace_id?: string;
  error?: string;
};

export const syncFbAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sinceDays?: number; testCode?: string }) => ({
    sinceDays: Math.min(Math.max(Math.floor(input?.sinceDays ?? 30), 1), 365),
    testCode: input?.testCode?.trim() || undefined,
  }))
  .handler(async ({ data, context }): Promise<SyncResult> => {
    // Admin only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false, sent: 0, error: "Forbidden" };

    const token = process.env.FB_CAPI_ACCESS_TOKEN;
    if (!token) {
      return { ok: false, sent: 0, error: "Missing FB_CAPI_ACCESS_TOKEN secret" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pixel ID lives in the FB pixel row; FB_AUDIENCE row can override token.
    const { data: pixels } = await supabaseAdmin
      .from("tracking_pixels")
      .select("provider, pixel_id, access_token, enabled")
      .in("provider", ["facebook_pixel", "fb_audience"])
      .eq("enabled", true);

    const pixelRow = pixels?.find((p) => p.provider === "facebook_pixel");
    const audienceRow = pixels?.find((p) => p.provider === "fb_audience");

    const pixelId = pixelRow?.pixel_id;
    if (!pixelId) {
      return { ok: false, sent: 0, error: "Enable Facebook Pixel & save Pixel ID first" };
    }

    const effectiveToken = audienceRow?.access_token || token;

    // Pull recent customers from completed orders
    const since = new Date(Date.now() - data.sinceDays * 86400_000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("email, phone, full_name, total, created_at")
      .gte("created_at", since)
      .in("status", ["completed", "delivered"])
      .limit(1000);

    if (!orders || orders.length === 0) {
      return { ok: true, sent: 0 };
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const events = orders
      .filter((o) => o.email || o.phone)
      .map((o) => {
        const user_data: Record<string, string[] | string> = {};
        if (o.email) user_data.em = [hash(o.email)];
        if (o.phone) user_data.ph = [hash(o.phone.replace(/\D/g, ""))];
        if (o.full_name) {
          const parts = o.full_name.trim().split(/\s+/);
          if (parts[0]) user_data.fn = [hash(parts[0])];
          if (parts.length > 1) user_data.ln = [hash(parts[parts.length - 1])];
        }
        return {
          event_name: "Purchase",
          event_time: eventTime,
          action_source: "website",
          user_data,
          custom_data: { currency: "BDT", value: Number(o.total) || 0 },
        };
      });

    const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(effectiveToken)}`;
    const body = JSON.stringify({
      data: events,
      ...(data.testCode ? { test_event_code: data.testCode } : {}),
    });

    let logStatus = "sent";
    let logError: string | null = null;
    let result: SyncResult = { ok: true, sent: events.length };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = (await resp.json()) as {
        events_received?: number;
        fbtrace_id?: string;
        error?: { message?: string };
      };
      if (!resp.ok || json.error) {
        logStatus = "failed";
        logError = json.error?.message ?? `HTTP ${resp.status}`;
        result = { ok: false, sent: events.length, error: logError };
      } else {
        result = {
          ok: true,
          sent: events.length,
          events_received: json.events_received,
          fbtrace_id: json.fbtrace_id,
        };
      }

      await supabaseAdmin.from("tracking_events_log").insert({
        provider: "fb_audience",
        event_name: "Purchase",
        payload: { count: events.length, sinceDays: data.sinceDays } as never,
        status: logStatus,
        response: json as never,
        error_message: logError,
      } as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      await supabaseAdmin.from("tracking_events_log").insert({
        provider: "fb_audience",
        event_name: "Purchase",
        payload: { count: events.length } as never,
        status: "failed",
        error_message: msg,
      } as never);
      return { ok: false, sent: events.length, error: msg };
    }

    return result;
  });
