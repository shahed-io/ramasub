import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SECURITY: strict allowlist of event types; unknown events are rejected so
// callers can't inject arbitrary titles/messages to spoof business events.
const EVENT_TYPES = [
  "order_created",
  "order_status_changed",
  "wallet_topup",
  "support_ticket",
  "chat_message",
  "offer_submission",
  "new_signup",
  "abandoned_checkout",
  "test",
] as const;

const notifyInputSchema = z.object({
  event: z.enum(EVENT_TYPES),
  title: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
  lines: z
    .array(z.tuple([z.string().max(80), z.union([z.string().max(300), z.number()])]))
    .max(20)
    .optional(),
  url: z.string().url().max(500).optional(),
});

type NotifyInput = z.infer<typeof notifyInputSchema>;

function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
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
    test: "✅",
  };
  const em = emoji[input.event] ?? "🔔";
  const title = input.title ?? input.event.replace(/_/g, " ").toUpperCase();
  const parts: string[] = [`${em} <b>${esc(title)}</b>`];
  if (input.message) parts.push(esc(input.message));
  if (input.lines?.length) {
    for (const [k, v] of input.lines) parts.push(`<b>${esc(k)}:</b> ${esc(String(v))}`);
  }
  if (input.url) parts.push(`🔗 ${esc(input.url)}`);
  parts.push(`\n<i>RamaSub · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</i>`);
  return parts.join("\n");
}

// SECURITY: require an authenticated caller so anonymous visitors can't spam
// the admin Telegram chat. Input is strictly validated (allowlisted events,
// capped lengths, URL-shaped `url`).
export const sendTelegramNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    if (data.event !== "test" && s.events && s.events[data.event] === false) {
      return { ok: false, reason: "event_disabled" };
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
