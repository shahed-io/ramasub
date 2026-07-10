import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createLinkCode, getMyTelegramLink, unlinkTelegram } from "@/lib/telegram-customer.functions";
import { useAuth } from "@/context/AuthContext";
import { Send, CheckCircle2, ExternalLink, Loader2, Unplug, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/connect-telegram")({
  component: ConnectTelegramPage,
  head: () => ({
    meta: [
      { title: "Connect Telegram — Rama Sub" },
      { name: "description", content: "আপনার RamaSub account Telegram-এ connect করুন এবং real-time order update পান।" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ConnectTelegramPage() {
  const { user, loading: authLoading } = useAuth();
  const getLink = useServerFn(getMyTelegramLink);
  const createCode = useServerFn(createLinkCode);
  const unlink = useServerFn(unlinkTelegram);
  const [state, setState] = useState<{
    loading: boolean;
    link: any;
    botUsername: string | null;
    botEnabled: boolean;
  }>({ loading: true, link: null, botUsername: null, botEnabled: false });
  const [gen, setGen] = useState<{ url: string; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await getLink();
      setState({ loading: false, ...(r as any) });
    } catch (e) {
      setState({ loading: false, link: null, botUsername: null, botEnabled: false });
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => { if (user) void load(); }, [user]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex items-center justify-center p-6">
        {authLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        ) : (
          <div className="max-w-md text-center bg-white rounded-2xl border p-8 shadow-sm">
            <ShieldCheck className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <div className="font-bold text-slate-900 text-lg mb-1">Sign in required</div>
            <div className="text-sm text-slate-600 mb-4">Telegram connect করতে আগে RamaSub-এ login করুন।</div>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700">
              Sign in
            </Link>
          </div>
        )}
      </div>
    );
  }

  const doGenerate = async () => {
    setBusy(true); setErr(null);
    try {
      const r = (await createCode()) as any;
      if (!r?.ok) setErr(r?.error ?? "Failed to generate link");
      else setGen({ url: r.url, code: r.code });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const doUnlink = async () => {
    if (!confirm("Telegram disconnect করতে চান?")) return;
    setBusy(true); setErr(null);
    try {
      await unlink();
      setGen(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg mb-3">
            <Send className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Connect Telegram</h1>
          <p className="text-slate-600 mt-1">Real-time order updates সরাসরি Telegram-এ।</p>
        </div>

        {state.loading ? (
          <div className="rounded-2xl border bg-white p-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : !state.botEnabled || !state.botUsername ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            ⚠️ RamaSub Customer Telegram bot এখনো configure হয়নি। Admin setup সম্পূর্ণ হলে আবার চেষ্টা করুন।
          </div>
        ) : state.link ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900">Telegram Connected</div>
                <div className="text-sm text-slate-600 mt-1">
                  {state.link.first_name ?? ""} {state.link.last_name ?? ""}
                  {state.link.telegram_username && <span className="text-slate-500"> · @{state.link.telegram_username}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Linked {new Date(state.link.linked_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t flex flex-wrap gap-3">
              <a
                href={`https://t.me/${state.botUsername}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4" /> Open bot
              </a>
              <button
                onClick={doUnlink}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2 text-sm font-semibold hover:bg-rose-100 disabled:opacity-50"
              >
                <Unplug className="w-4 h-4" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm text-slate-700 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-500" /> কি পাবেন?
              </div>
              <ul className="list-disc ml-5 space-y-1 text-slate-700">
                <li>Order status change হলে সাথে সাথে notification</li>
                <li>Wallet top-up ও promotion update</li>
                <li>Support-এর দ্রুত access</li>
              </ul>
            </div>

            {!gen ? (
              <button
                onClick={doGenerate}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white px-4 py-3 font-semibold shadow hover:shadow-md disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Generate Telegram link
              </button>
            ) : (
              <div className="space-y-3">
                <a
                  href={gen.url}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setTimeout(load, 6000)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white px-4 py-3 font-semibold shadow hover:shadow-md"
                >
                  <ExternalLink className="w-5 h-5" /> Open Telegram to link
                </a>
                <div className="text-xs text-slate-500 text-center">
                  Telegram open হলে "Start" চাপুন। ১৫ মিনিটের মধ্যে code expire হবে।
                </div>
                <button
                  onClick={load}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Already linked? Refresh status
                </button>
              </div>
            )}

            <div className="pt-4 border-t text-xs text-slate-500">
              বিকল্প: bot-এ যেয়ে <code className="bg-slate-100 px-1.5 py-0.5 rounded">/start</code> চাপুন → "📱 Share phone number" দিন।
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">{err}</div>
        )}
      </div>
    </div>
  );
}
