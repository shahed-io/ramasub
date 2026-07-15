import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { testTelegramConnection } from "@/lib/telegram.functions";
import { setCustomerBotWebhook } from "@/lib/telegram-customer.functions";

import { Bot, Save, Send, CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff, RefreshCw, Users, Link2 } from "lucide-react";

export const Route = createFileRoute("/Mahbub214/telegram")({
  component: TelegramAdmin,
  head: () => ({ meta: [{ title: "Telegram Monitoring — Admin" }] }),
});

const EVENT_LABELS: Array<{ key: string; label: string; desc: string }> = [
  { key: "order_created", label: "🛒 নতুন অর্ডার", desc: "যখন customer নতুন order দিবে" },
  { key: "order_status_changed", label: "📦 অর্ডার স্ট্যাটাস পরিবর্তন", desc: "Order status update হলে" },
  { key: "wallet_topup", label: "💰 ওয়ালেট Top-up রিকোয়েস্ট", desc: "Customer wallet-এ টাকা load করার request দিলে" },
  { key: "support_ticket", label: "🎧 সাপোর্ট টিকিট", desc: "নতুন support ticket তৈরি হলে" },
  { key: "chat_message", label: "💬 লাইভ চ্যাট মেসেজ", desc: "Customer live chat-এ message দিলে" },
  { key: "offer_submission", label: "🎁 অফার সাবমিশন", desc: "Giveaway/Offer form submit হলে" },
  { key: "new_signup", label: "👤 নতুন Signup", desc: "নতুন user register করলে" },
  { key: "abandoned_checkout", label: "🛍️ Abandoned Checkout", desc: "Checkout শুরু করে ফেলে দিলে" },
];

function TelegramAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<any[]>([]);

  // Customer bot
  const [custToken, setCustToken] = useState("");
  const [custUsername, setCustUsername] = useState("");
  const [custEnabled, setCustEnabled] = useState(false);
  const [showCustToken, setShowCustToken] = useState(false);
  const [linkCount, setLinkCount] = useState<number>(0);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const test = useServerFn(testTelegramConnection);
  const setWebhook = useServerFn(setCustomerBotWebhook);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("telegram_settings" as any).select("*").eq("singleton", true).maybeSingle();
    const s = data as any;
    if (s) {
      setBotToken(s.bot_token ?? "");
      setChatId(s.chat_id ?? "");
      setEnabled(!!s.enabled);
      setEvents(s.events ?? {});
      setCustToken(s.customer_bot_token ?? "");
      setCustUsername(s.customer_bot_username ?? "");
      setCustEnabled(!!s.customer_bot_enabled);
    }
    const { data: l } = await supabase
      .from("telegram_notifications_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((l as any[]) ?? []);
    const { count } = await supabase
      .from("telegram_customer_links" as any)
      .select("*", { count: "exact", head: true });
    setLinkCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    const { error } = await supabase
      .from("telegram_settings" as any)
      .update({
        bot_token: botToken.trim() || null,
        chat_id: chatId.trim() || null,
        enabled,
        events,
        customer_bot_token: custToken.trim() || null,
        customer_bot_username: custUsername.trim().replace(/^@/, "") || null,
        customer_bot_enabled: custEnabled,
      } as any)
      .eq("singleton", true);
    setSaving(false);
    if (error) setMsg({ tone: "err", text: error.message });
    else setMsg({ tone: "ok", text: "Settings saved successfully." });
  };

  const runTest = async () => {
    setTesting(true); setMsg(null);
    if (botToken.trim() || chatId.trim() || Object.keys(events).length) {
      await supabase.from("telegram_settings" as any).update({
        bot_token: botToken.trim() || null, chat_id: chatId.trim() || null, enabled, events,
      } as any).eq("singleton", true);
    }
    const r = await test().catch((e) => ({ ok: false, error: String(e) }));
    setTesting(false);
    if ((r as any).ok) setMsg({ tone: "ok", text: "Test message sent! Telegram-এ চেক করুন।" });
    else setMsg({ tone: "err", text: (r as any).error ?? "Failed" });
    void load();
  };

  const registerWebhook = async () => {
    setWebhookBusy(true); setMsg(null);
    const publicUrl = window.location.origin;
    const r = await setWebhook({ data: { publicUrl } }).catch((e) => ({ ok: false, error: String(e), url: "" }));
    setWebhookBusy(false);
    const rr = r as any;
    if (rr.ok) setMsg({ tone: "ok", text: `Webhook registered: ${rr.url}` });
    else setMsg({ tone: "err", text: rr.error ?? "Failed to register webhook" });
  };


  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 min-h-screen">

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${
          msg.tone === "ok" ? "bg-violet-50 border-violet-200 text-violet-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {msg.tone === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Setup guide */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 text-sm text-slate-700 space-y-2">
        <div className="font-semibold text-slate-900">⚡ কিভাবে setup করবেন:</div>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Telegram-এ <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather <ExternalLink className="w-3 h-3" /></a> খুলুন → <code className="bg-white px-1.5 rounded">/newbot</code> command দিন → bot নাম দিন → <b>Bot Token</b> পাবেন।</li>
          <li>আপনার bot-এ গিয়ে <code className="bg-white px-1.5 rounded">/start</code> চাপুন (নাহলে bot message পাঠাতে পারবে না)।</li>
          <li>নিজের <b>Chat ID</b> নিতে <a className="text-blue-600 underline inline-flex items-center gap-1" href="https://t.me/userinfobot" target="_blank" rel="noopener">@userinfobot <ExternalLink className="w-3 h-3" /></a> খুলে <code className="bg-white px-1.5 rounded">/start</code> দিন।</li>
          <li>নিচে দুটো paste করুন → <b>Enable</b> চালু করুন → <b>Save</b> → <b>Send Test</b> চাপুন।</li>
          <li>Group-এ notification চাইলে bot কে group-এ add করে group-এর ID দিন (নেগেটিভ number)।</li>
        </ol>
      </div>

      {/* Config */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Bot Configuration</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-slate-600">Enable notifications</span>
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-violet-500 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bot Token</span>
            <div className="relative mt-1">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdef..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Chat ID</span>
            <input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789 (or -1001234567890 for group)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
          <button onClick={runTest} disabled={testing || loading || !botToken || !chatId} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test Message
          </button>
        </div>
      </div>

      {/* Event toggles */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">কোন কোন event-এ notification পাঠাবে?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {EVENT_LABELS.map((ev) => {
            const on = events[ev.key] !== false;
            return (
              <label key={ev.key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${on ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-slate-50/40"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setEvents({ ...events, [ev.key]: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900">{ev.label}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{ev.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Customer Bot */}
      <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/60 to-white p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Customer Bot (Rama Sub)</h3>
              <div className="text-xs text-slate-600">Customer-দের সরাসরি order status update পাঠান</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{linkCount} linked user{linkCount === 1 ? "" : "s"}</span>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="text-sm text-slate-600">Enable</span>
              <input type="checkbox" className="sr-only peer" checked={custEnabled} onChange={(e) => setCustEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-violet-500 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-white/70 p-3 text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">🛍️ Full In-Bot Shopping — কিভাবে কাজ করে:</div>
          <ol className="list-decimal ml-5 space-y-0.5">
            <li>BotFather-এ <code className="bg-slate-100 px-1 rounded">/newbot</code> দিয়ে আরেকটা bot বানান (admin bot থেকে আলাদা)।</li>
            <li>Token + username নিচে দিয়ে <b>Save</b> করুন → <b>Enable</b> করুন।</li>
            <li><b>Register Webhook</b> চাপুন — এটা automatic secret generate করে, incoming message + inline button click দুটোই enable করে।</li>
            <li>Customer <a className="text-sky-600 underline" href="/connect-telegram" target="_blank" rel="noopener">/connect-telegram</a> থেকে link করার পর bot-এ <code className="bg-slate-100 px-1 rounded">/start</code> দিয়ে সরাসরি <b>Shop → Product select → Wallet/bKash/Nagad payment → Order confirm</b> — সব bot এর ভিতরেই complete হবে। ওয়েবসাইট open করা লাগবে না।</li>
            <li>Order status change হলে customer এখানেই notification পাবে।</li>
          </ol>
        </div>


        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer Bot Token</span>
            <div className="relative mt-1">
              <input
                type={showCustToken ? "text" : "password"}
                value={custToken}
                onChange={(e) => setCustToken(e.target.value)}
                placeholder="123456789:ABCdef..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm font-mono focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
              />
              <button type="button" onClick={() => setShowCustToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700">
                {showCustToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bot Username (without @)</span>
            <input
              value={custUsername}
              onChange={(e) => setCustUsername(e.target.value)}
              placeholder="RamaSubBot"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Customer Bot
          </button>
          <button onClick={registerWebhook} disabled={webhookBusy || !custToken || !custEnabled} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {webhookBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Register Webhook
          </button>
          {custUsername && (
            <a href={`https://t.me/${custUsername.replace(/^@/, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
              <ExternalLink className="w-4 h-4" /> Open bot
            </a>
          )}
        </div>
      </div>



      {/* Recent log */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Recent Notifications (last 20)</h3>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">কোনো notification পাঠানো হয়নি।</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${l.success ? "bg-violet-50/50 border-violet-200" : "bg-rose-50/50 border-rose-200"}`}>
                {l.success ? <CheckCircle2 className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{l.event_type}</span>
                    <span className="text-xs text-slate-500">{new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</span>
                  </div>
                  {l.error && <div className="text-xs text-rose-700 mt-0.5">{l.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
