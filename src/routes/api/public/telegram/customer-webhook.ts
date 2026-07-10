import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------
// Customer Telegram bot webhook
//
// Handles:
//   /start                 → welcome + instructions
//   /start <linkCode>      → deep-link account link
//   Contact share (phone)  → phone-based OTP flow
//   Any text as OTP        → verify pending OTP
//   /unlink                → disconnect account
//   /help                  → command list
// ---------------------------------------------------------------

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}

async function loadBot() {
  const { data } = await admin()
    .from("telegram_settings" as any)
    .select("customer_bot_token, customer_bot_enabled, customer_bot_username")
    .eq("singleton", true)
    .maybeSingle();
  return data as any;
}

async function reply(token: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...extra,
    }),
  }).catch(() => {});
}

function normalisePhone(raw: string): string {
  // Store E.164-like: strip everything except digits and leading +
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  return trimmed.replace(/\D/g, "");
}

async function findUserByPhone(phone: string): Promise<string | null> {
  const variants = new Set<string>();
  const digits = phone.replace(/\D/g, "");
  variants.add(phone);
  variants.add(digits);
  if (!phone.startsWith("+")) variants.add("+" + digits);
  // Bangladesh: often stored as 01... or 8801... or +8801...
  if (digits.startsWith("880")) variants.add("0" + digits.slice(3));
  if (digits.startsWith("0")) variants.add("880" + digits.slice(1));

  for (const v of variants) {
    const { data } = await admin()
      .from("profiles" as any)
      .select("id")
      .eq("phone", v)
      .maybeSingle();
    if (data && (data as any).id) return (data as any).id as string;
  }
  return null;
}

async function linkUser(
  userId: string,
  chatId: number,
  info: { username?: string; firstName?: string; lastName?: string; phone?: string },
) {
  await admin()
    .from("telegram_customer_links" as any)
    .upsert(
      (
      {
        user_id: userId,
        chat_id: chatId,
        telegram_username: info.username ?? null,
        first_name: info.firstName ?? null,
        last_name: info.lastName ?? null,
        phone: info.phone ?? null,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}

export const Route = createFileRoute("/api/public/telegram/customer-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: any = {};
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true });
        }

        const bot = await loadBot();
        if (!bot?.customer_bot_token || !bot?.customer_bot_enabled) {
          return Response.json({ ok: true, ignored: "bot_disabled" });
        }
        const token = bot.customer_bot_token as string;

        const msg = update.message;
        if (!msg?.chat?.id) return Response.json({ ok: true });
        const chatId: number = msg.chat.id;
        const from = msg.from ?? {};
        const info = {
          username: from.username as string | undefined,
          firstName: from.first_name as string | undefined,
          lastName: from.last_name as string | undefined,
        };

        // 1) Contact shared → phone OTP flow
        if (msg.contact?.phone_number) {
          const phone = normalisePhone(msg.contact.phone_number);
          const userId = await findUserByPhone(phone);
          if (!userId) {
            await reply(
              token,
              chatId,
              "❌ <b>Account not found</b>\n\nএই phone number দিয়ে RamaSub-এ কোনো account নেই।\n\nআগে <a href=\"https://ramasub.com/register\">ramasub.com</a>-এ signup করুন, তারপর আবার চেষ্টা করুন।",
            );
            return Response.json({ ok: true });
          }
          // Direct-link if the contact belongs to the sender
          if (msg.contact.user_id && Number(msg.contact.user_id) === Number(from.id)) {
            await linkUser(userId, chatId, { ...info, phone });
            await reply(
              token,
              chatId,
              `✅ <b>Connected!</b>\n\nআপনার RamaSub account সফলভাবে link হয়েছে। এখন থেকে সব order update এখানে পাবেন।`,
              { reply_markup: { remove_keyboard: true } },
            );
            return Response.json({ ok: true });
          }
          // Otherwise send OTP (shouldn't usually happen — Telegram only lets you share own contact via button)
          const code = String(Math.floor(100000 + Math.random() * 900000));
          await admin().from("telegram_phone_otps" as any).insert({ chat_id: chatId, phone, code });
          await reply(token, chatId, `🔐 <b>Verification code sent</b>\n\nআপনার SMS-এ পাঠানো 6-digit code এখানে পাঠান।`);
          return Response.json({ ok: true });
        }

        const text: string = (msg.text ?? "").trim();

        // 2) /start [code]
        if (text.startsWith("/start")) {
          const parts = text.split(/\s+/);
          const code = parts[1];
          if (code) {
            const { data: linkCode } = await admin()
              .from("telegram_link_codes" as any)
              .select("user_id, expires_at, consumed_at")
              .eq("code", code)
              .maybeSingle();
            const lc = linkCode as any;
            if (!lc) {
              await reply(token, chatId, "❌ এই link code invalid অথবা expired।");
            } else if (lc.consumed_at) {
              await reply(token, chatId, "❌ এই code ইতিমধ্যে ব্যবহৃত।");
            } else if (new Date(lc.expires_at) < new Date()) {
              await reply(token, chatId, "❌ এই link code-এর সময় শেষ। আবার নতুন link generate করুন।");
            } else {
              await linkUser(lc.user_id, chatId, info);
              await admin()
                .from("telegram_link_codes" as any)
                .update({ consumed_at: new Date().toISOString() })
                .eq("code", code);
              await reply(
                token,
                chatId,
                `✅ <b>Welcome to RamaSub!</b>\n\nআপনার account সফলভাবে connect হয়েছে। এখন থেকে সব order status update, wallet notification এখানে পাবেন।\n\n📦 Orders: https://ramasub.com/orders\n🛍️ Shop: https://ramasub.com`,
              );
            }
            return Response.json({ ok: true });
          }
          // Bare /start
          await reply(
            token,
            chatId,
            `👋 <b>Welcome to RamaSub Bot!</b>\n\nআপনার account link করতে দুইটা way:\n\n<b>1️⃣ Website থেকে:</b> <a href="https://ramasub.com/connect-telegram">এখানে click করুন</a>, তারপর "Open Telegram" চাপুন।\n\n<b>2️⃣ Phone দিয়ে:</b> নিচের "📱 Share phone" button চাপুন।`,
            {
              reply_markup: {
                keyboard: [[{ text: "📱 Share phone number", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            },
          );
          return Response.json({ ok: true });
        }

        // 3) 6-digit OTP verification
        if (/^\d{6}$/.test(text)) {
          const { data: pending } = await admin()
            .from("telegram_phone_otps" as any)
            .select("*")
            .eq("chat_id", chatId)
            .is("verified_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const p = pending as any;
          if (!p) {
            await reply(token, chatId, "কোনো pending verification নেই। /start দিন।");
            return Response.json({ ok: true });
          }
          if (new Date(p.expires_at) < new Date()) {
            await reply(token, chatId, "❌ OTP-এর সময় শেষ। আবার চেষ্টা করুন।");
            return Response.json({ ok: true });
          }
          if (p.attempts >= 5) {
            await reply(token, chatId, "❌ অনেকবার ভুল try করেছেন। নতুন করে শুরু করুন।");
            return Response.json({ ok: true });
          }
          if (p.code !== text) {
            await admin()
              .from("telegram_phone_otps" as any)
              .update({ attempts: (p.attempts ?? 0) + 1 })
              .eq("id", p.id);
            await reply(token, chatId, "❌ ভুল code। আবার চেষ্টা করুন।");
            return Response.json({ ok: true });
          }
          const userId = await findUserByPhone(p.phone);
          if (!userId) {
            await reply(token, chatId, "❌ এই phone-এ RamaSub account নেই।");
            return Response.json({ ok: true });
          }
          await linkUser(userId, chatId, { ...info, phone: p.phone });
          await admin()
            .from("telegram_phone_otps" as any)
            .update({ verified_at: new Date().toISOString() })
            .eq("id", p.id);
          await reply(token, chatId, "✅ <b>Connected!</b> আপনার account সফলভাবে link হয়েছে।");
          return Response.json({ ok: true });
        }

        // 4) /unlink
        if (text === "/unlink") {
          await admin().from("telegram_customer_links" as any).delete().eq("chat_id", chatId);
          await reply(token, chatId, "🔌 Disconnected. আবার connect করতে /start দিন।");
          return Response.json({ ok: true });
        }

        // 5) /help + default
        await reply(
          token,
          chatId,
          `<b>Commands</b>\n\n/start — account connect করুন\n/unlink — disconnect করুন\n/help — এই message\n\n🛍️ Shop: https://ramasub.com`,
        );
        return Response.json({ ok: true });
      },
    },
  },
});
