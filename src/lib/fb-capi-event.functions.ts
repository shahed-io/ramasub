import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { validator, z, httpUrl, jsonObject } from "@/lib/validation";

/**
 * Fires a single Meta Conversions API event to every enabled Facebook Pixel row
 * that has CAPI toggled ON and a valid Access Token.
 *
 * Called from client `trackEvent()` alongside `fbq('track', ...)` — the same
 * `event_id` is sent to both, so Meta dedupes browser + server events.
 *
 * Public (no auth middleware) — visitors trigger this on PageView, Purchase, etc.
 * Access tokens live only in the DB (admin-only column); nothing sensitive is
 * returned to the caller.
 */

const hash = (v: string) =>
  createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

/**
 * Strict schema. Public endpoint (visitors call it), so every field is pinned
 * by type + length + format and unknown keys are rejected outright.
 */
const EventInput = z
  .object({
    event_name: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[A-Za-z][A-Za-z0-9_]*$/, { message: "Invalid event_name" }),
    event_id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9._:-]+$/, { message: "Invalid event_id" }),
    event_source_url: httpUrl.optional(),
    custom_data: jsonObject(4_000).optional(),
    user_data: z
      .object({
        email: z.string().trim().max(200).email().optional(),
        phone: z.string().trim().max(40).regex(/^\+?[0-9\s()-]{6,40}$/).optional(),
        external_id: z.string().trim().max(200).optional(),
        fbp: z.string().trim().max(200).regex(/^[A-Za-z0-9._-]+$/).optional(),
        fbc: z.string().trim().max(500).regex(/^[A-Za-z0-9._%-]+$/).optional(),
        client_user_agent: z.string().trim().max(500).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

type UserData = NonNullable<z.infer<typeof EventInput>["user_data"]>;

export const sendFbCapiEvent = createServerFn({ method: "POST" })
  .inputValidator(validator(EventInput))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("tracking_pixels")
      .select("pixel_id, access_token, events_config, enabled")
      .eq("provider", "facebook_pixel")
      .eq("enabled", true);

    if (!rows?.length) return { ok: true, sent: 0, skipped: 0 };

    const eventTime = Math.floor(Date.now() / 1000);
    let sent = 0;
    let skipped = 0;

    const u = data.user_data ?? {};

    // Meta rejects an event with error 2804005 ("no customer information
    // parameters") when none of em/ph/external_id/fbp/fbc/ip are present.
    // The browser cannot know its own IP, so resolve it server-side here.
    const fwd = getRequestHeader("x-forwarded-for") ?? "";
    const clientIp =
      (getRequestIP({ xForwardedFor: true }) ||
        fwd.split(",")[0] ||
        getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-real-ip") ||
        "").trim();
    const clientUa =
      u.client_user_agent || getRequestHeader("user-agent") || undefined;

    const ud: Record<string, string[] | string> = {};
    if (u.email) ud.em = [hash(u.email)];
    if (u.phone) ud.ph = [hash(u.phone.replace(/\D/g, ""))];
    if (u.external_id) ud.external_id = [hash(u.external_id)];
    if (u.fbp) ud.fbp = u.fbp;
    if (u.fbc) ud.fbc = u.fbc;
    if (clientUa) ud.client_user_agent = clientUa;
    // IPv6-mapped IPv4 (::ffff:1.2.3.4) is rejected — normalise it.
    if (clientIp) ud.client_ip_address = clientIp.replace(/^::ffff:/i, "");

    // Still nothing Meta can match on → skip the call instead of logging a
    // guaranteed "Invalid parameter" failure.
    const hasMatchKey =
      !!(ud.em || ud.ph || ud.external_id || ud.fbp || ud.fbc || ud.client_ip_address);
    if (!hasMatchKey) {
      return { ok: true, sent: 0, skipped: rows.length, reason: "no_match_keys" };
    }

    for (const row of rows) {
      const cfg = ((row.events_config ?? {}) as {
        capi_enabled?: boolean;
        test_event_code?: string;
        events?: Record<string, boolean>;
      });
      if (!cfg.capi_enabled) {
        skipped++;
        continue;
      }
      const token = (row.access_token || "").trim() || process.env.FB_CAPI_ACCESS_TOKEN;
      if (!token || !row.pixel_id) {
        skipped++;
        continue;
      }
      const eventsMap = cfg.events ?? {};
      if (data.event_name in eventsMap && !eventsMap[data.event_name]) {
        skipped++;
        continue;
      }

      const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(
        row.pixel_id,
      )}/events?access_token=${encodeURIComponent(token)}`;

      const body = JSON.stringify({
        data: [
          {
            event_name: data.event_name,
            event_time: eventTime,
            event_id: data.event_id,
            action_source: "website",
            event_source_url: data.event_source_url,
            user_data: ud,
            custom_data: data.custom_data ?? {},
          },
        ],
        ...(cfg.test_event_code ? { test_event_code: cfg.test_event_code } : {}),
      });

      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const j = (await r.json().catch(() => ({}))) as {
          error?: { message?: string };
          events_received?: number;
          fbtrace_id?: string;
        };
        const ok = r.ok && !j.error;
        if (ok) sent++;
        await supabaseAdmin.from("tracking_events_log").insert({
          provider: "facebook_pixel",
          event_name: data.event_name,
          payload: { pixel_id: row.pixel_id, event_id: data.event_id } as never,
          status: ok ? "sent" : "failed",
          response: j as never,
          error_message: ok ? null : j.error?.message ?? `HTTP ${r.status}`,
        } as never);
      } catch (e) {
        await supabaseAdmin.from("tracking_events_log").insert({
          provider: "facebook_pixel",
          event_name: data.event_name,
          payload: { pixel_id: row.pixel_id, event_id: data.event_id } as never,
          status: "failed",
          error_message: e instanceof Error ? e.message : "Network error",
        } as never);
      }
    }

    return { ok: true, sent, skipped };
  });
