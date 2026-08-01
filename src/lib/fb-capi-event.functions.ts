import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { createHash } from "crypto";

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

type UserData = {
  email?: string;
  phone?: string;
  external_id?: string;
  fbp?: string;
  fbc?: string;
  client_user_agent?: string;
};

type Input = {
  event_name: string;
  event_id: string;
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
  user_data?: UserData;
};

function validate(input: unknown): Input {
  const i = (input ?? {}) as Partial<Input>;
  const event_name = String(i.event_name ?? "").trim();
  const event_id = String(i.event_id ?? "").trim();
  if (!event_name || event_name.length > 60) throw new Error("Invalid event_name");
  if (!event_id || event_id.length > 100) throw new Error("Invalid event_id");
  const url = i.event_source_url ? String(i.event_source_url).slice(0, 500) : undefined;
  const custom_data =
    i.custom_data && typeof i.custom_data === "object"
      ? (i.custom_data as Record<string, unknown>)
      : undefined;
  const u = (i.user_data ?? {}) as UserData;
  const user_data: UserData = {
    email: u.email?.slice(0, 200),
    phone: u.phone?.slice(0, 40),
    external_id: u.external_id?.slice(0, 200),
    fbp: u.fbp?.slice(0, 200),
    fbc: u.fbc?.slice(0, 500),
    client_user_agent: u.client_user_agent?.slice(0, 500),
  };
  return { event_name, event_id, event_source_url: url, custom_data, user_data };
}

export const sendFbCapiEvent = createServerFn({ method: "POST" })
  .inputValidator(validate)
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
