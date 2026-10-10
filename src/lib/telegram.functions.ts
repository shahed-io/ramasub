import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


// SECURITY: this endpoint is reachable without auth (new_signup fires before a
// session exists, guests trigger chat/abandoned-checkout events). To stop
// anonymous callers from spoofing convincing admin alerts we:
//  - reject the "test" event (admins use testTelegramConnection instead),
//  - ignore any client-supplied title and use a fixed server-side label,
//  - never render a client-supplied absolute URL: only same-site paths pass,
//  - clearly mark every message as unverified/client-reported,
//  - cap how many notifications can be relayed per minute.
const PUBLIC_EVENT_TYPES = [
  "order_created",
  "order_status_changed",
  "wallet_topup",
  "support_ticket",
  "chat_message",
  "offer_submission",
  "new_signup",
  "abandoned_checkout",
] as const;

const EVENT_LABELS: Record<string, string> = {
  order_created: "New Order",
  order_status_changed: "Order Status Changed",
  wallet_topup: "Wallet Top-up Request",
  support_ticket: "Support Ticket",
  chat_message: "Live Chat Message",
  offer_submission: "Offer Submission",
  new_signup: "New Signup",
  abandoned_checkout: "Abandoned Checkout",
  test: "Connection Test",
};

const SITE_ORIGINS = ["https://ramasub.com", "https://www.ramasub.com"];

const notifyInputSchema = z.object({
  event: z.enum(PUBLIC_EVENT_TYPES),
  title: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
  lines: z
    .array(z.tuple([z.string().max(80), z.union([z.string().max(300), z.number()])]))
    .max(20)
    .optional(),
  url: z.string().max(500).optional(),
});

type NotifyInput = z.infer<typeof notifyInputSchema>;

function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

/** Only same-site links survive; attacker-controlled hosts are dropped. */
function safeUrl(raw?: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return `${SITE_ORIGINS[0]}${raw}`;
  try {
    const u = new URL(raw);
    if (SITE_ORIGINS.includes(u.origin)) return u.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

function buildText(input: NotifyInput): string {
  const emoji: Record<string, string> = {
    order_created: "🛒",
    order_status_changed: "📦",
    wallet_topup: "💰",
    support_ticket: "🎧",
    chat_message: "💬",
    offer_submission: "🎁",
    new_signup: "👤",
    abandoned_checkout: "🛍️",
  };
  const em = emoji[input.event] ?? "🔔";
  // Client-supplied title is ignored — only the fixed server-side label is used.
  const title = EVENT_LABELS[input.event] ?? input.event.replace(/_/g, " ").toUpperCase();
  const parts: string[] = [`${em} <b>${esc(title)}</b>`];
  if (input.message) parts.push(esc(input.message));
  if (input.lines?.length) {
    for (const [k, v] of input.lines) parts.push(`<b>${esc(k)}:</b> ${esc(String(v))}`);
  }
  const url = safeUrl(input.url);
  if (url) parts.push(`🔗 ${esc(url)}`);
  parts.push(
    `\n<i>⚠️ Unverified client-reported event — confirm in the admin panel before acting.</i>`,
  );
  parts.push(`<i>RamaSub · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</i>`);
  return parts.join("\n");
}

const FLOOD_WINDOW_MS = 60_000;
const FLOOD_MAX = 30;

export const sendTelegramNotification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => notifyInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("telegram_settings" as any)
      .select("bot_token, chat_id, enabled, events")
      .eq("singleton", true)
      .maybeSingle();

    const s = settings as any;
    if (!s || !s.enabled || !s.bot_token || !s.chat_id) {
      return { ok: false, reason: "disabled_or_unconfigured" };
    }
    if (s.events && s.events[data.event] === false) {
      return { ok: false, reason: "event_disabled" };
    }

    // Flood guard: never relay more than FLOOD_MAX messages per minute.
    const since = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("telegram_notifications_log" as any)
      .select("id", { count: "exact", head: true })
      .gt("created_at", since);
    if ((count ?? 0) >= FLOOD_MAX) {
      return { ok: false, reason: "rate_limited" };
    }

    const text = buildText(data);
    let success = false;
    let error: string | null = null;
    try {
      const resp = await fetch(`https://api.telegram.org/bot${s.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: s.chat_id,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const j = await resp.json().catch(() => ({}));
      success = !!j.ok;
      if (!success) error = j.description ?? `HTTP ${resp.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    await supabaseAdmin.from("telegram_notifications_log" as any).insert({
      event_type: data.event,
      payload: data as any,
      message: text,
      success,
      error,
    });

    return { ok: success, error };
  });


async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(context.userId);
}

// SECURITY: admin-only test button; must not be callable by anonymous visitors.
export const testTelegramConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("telegram_settings" as any)
      .select("bot_token, chat_id")
      .eq("singleton", true)
      .maybeSingle();
    const s = data as any;
    if (!s?.bot_token || !s?.chat_id) return { ok: false, error: "Please save bot token and chat ID first." };
    try {
      const resp = await fetch(`https://api.telegram.org/bot${s.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: s.chat_id,
          text: "✅ <b>RamaSub Telegram Test</b>\n\nআপনার Telegram monitoring সঠিকভাবে কাজ করছে। 🎉",
          parse_mode: "HTML",
        }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!j.ok) return { ok: false, error: j.description ?? `HTTP ${resp.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
