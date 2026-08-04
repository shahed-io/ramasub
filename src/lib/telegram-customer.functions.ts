import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------------
// Rama Sub — Customer Telegram bot server functions
// ------------------------------------------------------------------
// - createLinkCode  : signed-in user gets a one-time deep-link code + URL
// - getMyTelegramLink : signed-in user reads their current link
// - unlinkTelegram  : signed-in user disconnects their Telegram
// - notifyCustomerOrderStatus : admin-only; sends order status DM
// - setCustomerBotWebhook     : admin-only; registers Telegram webhook
// ------------------------------------------------------------------

function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

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

async function loadCustomerBot() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_settings" as any)
    .select("customer_bot_token, customer_bot_username, customer_bot_enabled, customer_events")
    .eq("singleton", true)
    .maybeSingle();
  return data as any;
}

async function tgSend(token: string, chatId: number | string, text: string, extra?: Record<string, unknown>) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(extra ?? {}),
      }),
    });
    const j = (await resp.json().catch(() => ({}))) as any;
    return { ok: !!j.ok, error: j.ok ? null : (j.description ?? `HTTP ${resp.status}`) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// -- Create one-time deep link code for signed-in user ----------------
export const createLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bot = await loadCustomerBot();
    if (!bot?.customer_bot_username) {
      return { ok: false as const, error: "Customer bot not configured yet. Please try again later." };
    }

    // 12-char url-safe random code
    const code = Array.from({ length: 12 }, () => {
      const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return alpha[Math.floor(Math.random() * alpha.length)];
    }).join("");

    // Clean up any old unconsumed codes for this user
    await supabaseAdmin
      .from("telegram_link_codes" as any)
      .delete()
      .eq("user_id", context.userId)
      .is("consumed_at", null);

    const { error } = await supabaseAdmin.from("telegram_link_codes" as any).insert({
      code,
      user_id: context.userId,
    } as any);
    if (error) return { ok: false as const, error: error.message };

    return {
      ok: true as const,
      code,
      url: `https://t.me/${bot.customer_bot_username}?start=${code}`,
      username: bot.customer_bot_username as string,
    };
  });

// -- Get my link -----------------------------------------------------
export const getMyTelegramLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bot = await loadCustomerBot();
    const { data } = await supabaseAdmin
      .from("telegram_customer_links" as any)
      .select("chat_id, telegram_username, first_name, last_name, phone, linked_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      link: (data as any) ?? null,
      botUsername: (bot?.customer_bot_username as string) ?? null,
      botEnabled: !!bot?.customer_bot_enabled,
    };
  });

// -- Unlink ----------------------------------------------------------
export const unlinkTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("telegram_customer_links" as any)
      .select("chat_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    await supabaseAdmin
      .from("telegram_customer_links" as any)
      .delete()
      .eq("user_id", context.userId);
    const bot = await loadCustomerBot();
    if (bot?.customer_bot_token && (link as any)?.chat_id) {
      await tgSend(
        bot.customer_bot_token,
        (link as any).chat_id,
        "🔌 <b>Disconnected</b>\n\nআপনার Telegram account RamaSub থেকে disconnect করা হয়েছে। যেকোনো সময় আবার connect করতে পারবেন।",
      );
    }
    return { ok: true };
  });

// -- Notify a customer about an order status change ------------------
const notifyOrderInput = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.string().max(40),
  fromStatus: z.string().max(40).nullish(),
  fullName: z.string().max(120).nullish(),
});

export const notifyCustomerOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notifyOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bot = await loadCustomerBot();
    if (!bot?.customer_bot_enabled || !bot?.customer_bot_token) {
      return { ok: false as const, reason: "disabled" };
    }
    if (bot.customer_events && bot.customer_events["order_status_changed"] === false) {
      return { ok: false as const, reason: "event_disabled" };
    }
    const { data: link } = await supabaseAdmin
      .from("telegram_customer_links" as any)
      .select("chat_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!link) return { ok: false as const, reason: "not_linked" };

    const emoji: Record<string, string> = {
      pending: "⏳", processing: "⚙️", delivered: "📦",
      completed: "✅", cancelled: "❌", refunded: "💸", failed: "⚠️",
      verified: "✅", paid: "💳",
    };
    const em = emoji[data.status] ?? "🔔";
    const shortId = "ORD-" + data.orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const lines = [
      `${em} <b>Order Status Updated</b>`,
      "",
      `<b>Order:</b> ${esc(shortId)}`,
      data.fullName ? `<b>Name:</b> ${esc(data.fullName)}` : "",
      data.fromStatus ? `<b>From:</b> ${esc(data.fromStatus)}` : "",
      `<b>To:</b> ${esc(data.status.toUpperCase())}`,
      "",
      `🔗 https://ramasub.com/orders`,
    ].filter(Boolean).join("\n");

    const res = await tgSend(bot.customer_bot_token, (link as any).chat_id, lines);
    return { ok: res.ok, error: res.error };
  });

// -- Admin: register the customer bot webhook ------------------------
// Auto-generates a webhook secret if none exists, stores it, and registers
// the webhook with Telegram — enabling both incoming messages AND inline
// button callbacks (for the in-bot shopping flow).
export const setCustomerBotWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publicUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current } = await supabaseAdmin
      .from("telegram_settings" as any)
      .select("customer_bot_token, customer_webhook_secret")
      .eq("singleton", true)
      .maybeSingle();
    const bot = current as any;
    if (!bot?.customer_bot_token) return { ok: false, error: "Bot token not configured", url: "" };

    // Ensure a webhook secret exists (auto-generate if missing) — this is
    // what the webhook route validates against every incoming update.
    let secret: string = bot.customer_webhook_secret ?? "";
    if (!secret || secret.length < 20) {
      const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      secret = Array.from({ length: 40 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
      await supabaseAdmin
        .from("telegram_settings" as any)
        .update({ customer_webhook_secret: secret } as any)
        .eq("singleton", true);
    }

    const webhookUrl = `${data.publicUrl.replace(/\/+$/, "")}/api/public/telegram/customer-webhook`;
    try {
      const resp = await fetch(`https://api.telegram.org/bot${bot.customer_bot_token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          // Enable both text messages AND inline button clicks (shopping UI)
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true,
        }),
      });
      const j = (await resp.json().catch(() => ({}))) as any;
      return { ok: !!j.ok, url: webhookUrl, error: j.ok ? null : (j.description ?? `HTTP ${resp.status}`) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), url: webhookUrl };
    }
  });

