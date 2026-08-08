import { createClient } from "@supabase/supabase-js";

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

/**
 * Sends a message from the Order Management (Admin) bot directly to the configured chat ID.
 * Used for system alerts that don't follow the general notifyTelegram schema.
 */
export async function sendAdminBotMessage(text: string) {
  try {
    const { data: settings } = await admin()
      .from("telegram_settings" as any)
      .select("bot_token, chat_id, enabled")
      .eq("singleton", true)
      .maybeSingle();

    const s = settings as any;
    if (!s || !s.enabled || !s.bot_token || !s.chat_id) return false;

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
    return !!j.ok;
  } catch (err) {
    console.error("sendAdminBotMessage error", err);
    return false;
  }
}
