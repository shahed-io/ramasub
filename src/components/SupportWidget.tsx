import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  MessageCircleMore,
  X,
  Send,
  Bot,
  Loader2,
  User2,
  Headphones,
  ChevronRight,
  Phone,
  ShieldCheck,
  Sparkles,
  Clock,
  Star,
  Zap,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const ADMIN_PHONE = "+8801580607614";
const ADMIN_TEL = "tel:+8801580607614";

type Msg = { role: "user" | "assistant"; content: string };
type Tab = "home" | "ai" | "faq";

const WHATSAPP_URL =
  "https://wa.me/8801580607614?text=" +
  encodeURIComponent("হ্যালো AccessNow BD! আমি একটি বিষয়ে সাহায্য চাচ্ছি।");

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const QUICK_PROMPTS = [
  "ডেলিভারি কত সময়ে পাব?",
  "পেমেন্ট মেথড কী কী?",
  "ChatGPT Plus এর দাম?",
  "WELCOME20 কুপন কীভাবে কাজ করে?",
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "ডেলিভারি কত সময়ে পাবো?",
    a: "অর্ডার কনফার্ম হওয়ার 5-30 মিনিটের মধ্যে আপনি অ্যাকাউন্ট ইমেইলে / WhatsApp-এ পেয়ে যাবেন।",
  },
  {
    q: "পেমেন্ট মেথড কী কী আছে?",
    a: "BKash, Nagad, Rocket, Upay এবং ব্যাংক ট্রান্সফার — সবগুলোই সাপোর্টেড।",
  },
  {
    q: "ওয়ারেন্টি কেমন থাকে?",
    a: "সব সাবস্ক্রিপশনে ফুল ওয়ারেন্টি — সমস্যা হলে রিপ্লেস বা রিফান্ড নিশ্চিত।",
  },
  {
    q: "কুপন কীভাবে ব্যবহার করব?",
    a: "চেকআউট পেইজে কুপন কোড বসিয়ে Apply চাপুন — ডিসকাউন্ট সাথে সাথেই দেখাবে।",
  },
  {
    q: "অর্ডার ক্যান্সেল করা যায়?",
    a: "ডেলিভারির আগে ক্যান্সেল সম্ভব। ডেলিভারির পরে সমস্যা হলে ওয়ারেন্টির আওতায় সাহায্য করা হবে।",
  },
];

import { useSupportWidgetConfig } from "@/hooks/useSupportWidgetConfig";
import { supabase } from "@/integrations/supabase/client";

const CHAT_SESSION_KEY = "anbd_chat_session_id";
function getChatSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CHAT_SESSION_KEY);
  if (!id) {
    id =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(CHAT_SESSION_KEY, id);
  }
  return id;
}
async function logChatMessage(role: "user" | "assistant", content: string) {
  try {
    const session_id = getChatSessionId();
    if (!session_id) return;
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    const visitor_label =
      user?.email ??
      (user?.user_metadata as { name?: string } | null)?.name ??
      null;
    await supabase.from("live_chat_messages" as any).insert({
      session_id,
      role,
      content: content.slice(0, 4000),
      user_id: user?.id ?? null,
      visitor_label,
    });
  } catch {
    /* non-blocking */
  }
}

export function SupportWidget() {
  const { data: cfg } = useSupportWidgetConfig();
  const [open, setOpen] = useState(false);
  const [chooser, setChooser] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open && !chooser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setChooser(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, chooser]);

  async function streamReply(history: Msg[]) {
    setLoading(true);
    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        let msg = "দুঃখিত, এখন কানেক্ট হচ্ছে না। WhatsApp-এ যোগাযোগ করুন।";
        try {
          const j = JSON.parse(errText);
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        upsert(msg);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      upsert("নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন বা WhatsApp করুন।");
    } finally {
      setLoading(false);
      if (acc.trim()) void logChatMessage("assistant", acc);
    }
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    void logChatMessage("user", t);
    void streamReply(next);
  }

  const PANEL =
    "fixed bottom-24 right-5 z-50 w-[min(400px,calc(100vw-1.5rem))] origin-bottom-right";
  const SHELL =
    "relative rounded-[28px] overflow-hidden border border-white/[0.12] bg-[#070922]/95 backdrop-blur-2xl shadow-[0_50px_120px_-20px_rgba(0,0,0,0.9)]";

  return (
    <>
      {/* === Floating launcher === */}
      {true && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
          {/* Chooser popup */}
          {chooser && (
            <div className="flex flex-col items-stretch gap-2.5 w-[230px] animate-fade-in">
              <button
                onClick={() => { setChooser(false); setOpen(true); setTab("ai"); }}
                className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0f29]/95 backdrop-blur-xl px-3.5 py-3 text-left shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] hover:border-violet-400/50 transition"
              >
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_10px_24px_-6px_rgba(168,85,247,0.7)] shrink-0">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <div className="text-[13px] font-extrabold text-white">AI Support</div>
                  <div className="text-[11px] text-white/70 mt-0.5">তাৎক্ষণিক উত্তর পান</div>
                </div>
              </button>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setChooser(false)}
                className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0f29]/95 backdrop-blur-xl px-3.5 py-3 text-left shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] hover:border-emerald-400/50 transition"
              >
                <span className="relative grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-[0_10px_24px_-6px_rgba(16,185,129,0.7)] shrink-0">
                  <MessageCircle className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-[#0b0f29] animate-pulse" />
                </span>
                <div className="leading-tight">
                  <div className="text-[13px] font-extrabold text-white">WhatsApp</div>
                  <div className="text-[11px] text-white/70 mt-0.5">সরাসরি কথা বলুন</div>
                </div>
              </a>

              <div className="text-center text-[11px] text-white/70 mt-1">কোনটি পছন্দ করবেন?</div>
            </div>
          )}

          <button
            onClick={() => {
              if (open) { setOpen(false); setChooser(false); return; }
              setChooser((v) => !v);
            }}
            aria-label={open || chooser ? "Close support" : "Open support"}
            className="relative group hover:scale-110 active:scale-95 transition-transform duration-300"
          >
            {/* Ripple ping waves (only when idle) */}
            {!open && !chooser && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${cfg?.ring_color ?? "#7c3aed"}66` }} />
                <span className="absolute inset-0 rounded-full animate-ping [animation-delay:0.6s]" style={{ backgroundColor: `${cfg?.spin_color_2 ?? "#00e5ff"}4d` }} />
              </>
            )}

            {/* Soft ambient glow */}
            <span
              className="absolute -inset-4 rounded-full opacity-60 blur-2xl group-hover:opacity-100 transition-opacity duration-500 animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${cfg?.ring_color ?? "#7c3aed"}66, ${cfg?.spin_color_1 ?? "#7c3aed"}66, ${cfg?.spin_color_2 ?? "#00e5ff"}66)`,
              }}
            />

            {/* Spinning conic ring */}
            <span
              className="absolute -inset-[3px] rounded-full opacity-90 animate-[spin_6s_linear_infinite]"
              style={{
                background: `conic-gradient(from 0deg, ${cfg?.spin_color_1 ?? "#7c3aed"}f2, ${cfg?.spin_color_2 ?? "#00e5ff"}f2, ${cfg?.spin_color_1 ?? "#7c3aed"}f2, ${cfg?.spin_color_2 ?? "#00e5ff"}f2, ${cfg?.spin_color_1 ?? "#7c3aed"}f2)`,
                filter: "blur(2px)",
              }}
            />

            {/* Main orb */}
            <span
              className="relative grid place-items-center h-16 w-16 rounded-full text-white shadow-[0_22px_50px_-12px_rgba(124,58,237,0.65)] ring-1 ring-white/20 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${cfg?.orb_from ?? "#1a1240"}, ${cfg?.orb_via ?? "#2a1a5e"}, ${cfg?.orb_to ?? "#0d1b3d"})` }}
            >
              <span className="absolute inset-x-2 top-1.5 h-4 rounded-full bg-white/20 blur-[3px]" />
              <span className="absolute -bottom-4 inset-x-3 h-6 rounded-full blur-xl" style={{ backgroundColor: `${cfg?.spin_color_2 ?? "#00e5ff"}66` }} />

              {(chooser || open) ? (
                <X className="h-7 w-7 relative drop-shadow-[0_2px_10px_rgba(0,229,255,0.6)]" strokeWidth={2.6} style={{ color: cfg?.icon_color ?? "#ffffff" }} />
              ) : (
                <MessageCircleMore
                  className="h-8 w-8 relative drop-shadow-[0_2px_10px_rgba(0,229,255,0.6)]"
                  strokeWidth={2.4}
                  style={{ color: cfg?.icon_color ?? "#ffffff" }}
                />
              )}
            </span>
          </button>

        </div>
      )}

      {/* === HOME TAB === */}
      {open && tab === "home" && (
        <div className={PANEL}>
          <div className={SHELL}>
            {/* Gradient hero header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-primary to-aqua" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

              <div className="relative px-5 pt-5 pb-6">
                <div className="flex items-start justify-between">
                  {/* Avatar stack */}
                  <div className="flex -space-x-2">
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white ring-2 ring-white/30 shadow-lg">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white ring-2 ring-white/30 shadow-lg">
                      <Headphones className="h-5 w-5" />
                    </span>
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-white/30 shadow-lg">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="grid place-items-center h-8 w-8 rounded-full text-white/85 hover:text-white hover:bg-white/15 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h2 className="mt-4 text-[22px] font-extrabold text-white leading-tight tracking-tight">
                  হ্যালো 👋
                  <br />
                  কীভাবে সাহায্য করব?
                </h2>
                <div className="mt-2.5 flex items-center gap-2 text-[11.5px] font-semibold text-white/90">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/40 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>24/7 অনলাইন</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-white/80">
                    <Clock className="h-3 w-3" />
                    ~2 মিনিটে রিপ্লাই
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="relative p-3 space-y-3 -mt-3">
              {/* Start a conversation card */}
              <button
                onClick={() => setTab("ai")}
                className="group relative w-full text-left rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.03] hover:border-violet-400/40 transition-all duration-300 p-3.5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-center gap-3">
                  <span className="relative grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_12px_28px_-8px_rgba(168,85,247,0.7)] shrink-0">
                    <MessageCircleMore className="h-5 w-5" />
                  </span>
                  <div className="flex-1 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-extrabold text-white">নতুন কথোপকথন শুরু করুন</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/25 text-violet-200 border border-violet-300/30">
                        AI
                      </span>
                    </div>
                    <span className="block text-[11.5px] text-white/70 mt-0.5">
                      তাৎক্ষণিক উত্তর — বাংলায়, 24/7
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition" />
                </div>
              </button>

              {/* Quick channels row */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-400/50 p-3 transition-all"
                >
                  <span className="relative grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.7)]">
                    <MessageCircle className="h-4.5 w-4.5" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-[#070922] animate-pulse" />
                  </span>
                  <div className="mt-2 text-[12.5px] font-extrabold text-white">WhatsApp</div>
                  <div className="text-[10.5px] text-white/70 mt-0.5">সরাসরি চ্যাট</div>
                </a>

                <a
                  href={ADMIN_TEL}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-aqua/50 p-3 transition-all"
                >
                  <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-500 to-aqua text-white shadow-[0_8px_20px_-6px_rgba(34,211,238,0.7)]">
                    <Phone className="h-4.5 w-4.5" />
                  </span>
                  <div className="mt-2 text-[12.5px] font-extrabold text-white">কল করুন</div>
                  <div className="text-[10.5px] text-white/70 mt-0.5 font-mono">
                    {ADMIN_PHONE}
                  </div>
                </a>
              </div>

              {/* Help / FAQ */}
              <button
                onClick={() => setTab("faq")}
                className="group w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-400/40 p-3 transition-all text-left"
              >
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_-6px_rgba(251,146,60,0.6)] shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </span>
                <div className="flex-1 leading-tight">
                  <div className="text-[13px] font-extrabold text-white">হেল্প সেন্টার</div>
                  <div className="text-[11px] text-white/70 mt-0.5">
                    জনপ্রিয় প্রশ্ন ও তাৎক্ষণিক উত্তর
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/65 group-hover:text-white/80 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Trust strip */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
                  <Zap className="h-3.5 w-3.5 text-amber-300 mx-auto" />
                  <div className="text-[10px] text-white/70 mt-1">দ্রুত রেসপন্স</div>
                  <div className="text-[11px] font-extrabold text-white">~2 মিনিট</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
                  <Star className="h-3.5 w-3.5 text-amber-300 mx-auto fill-amber-300" />
                  <div className="text-[10px] text-white/70 mt-1">রেটিং</div>
                  <div className="text-[11px] font-extrabold text-white">4.9 / 5</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 mx-auto" />
                  <div className="text-[10px] text-white/70 mt-1">ভেরিফাইড</div>
                  <div className="text-[11px] font-extrabold text-white">5000+</div>
                </div>
              </div>
            </div>

            {/* Bottom tab bar */}
            <BottomTabs tab={tab} setTab={setTab} />
          </div>
        </div>
      )}

      {/* === FAQ TAB === */}
      {open && tab === "faq" && (
        <div className={PANEL + " h-[min(620px,calc(100vh-1.5rem))]"}>
          <div className={SHELL + " h-full flex flex-col"}>
            <div className="pointer-events-none absolute -top-24 -left-20 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />

            <PanelHeader
              title="হেল্প সেন্টার"
              subtitle="জনপ্রিয় প্রশ্নের উত্তর"
              icon={<HelpCircle className="h-5 w-5" />}
              gradient="from-amber-400 to-orange-500"
              onBack={() => setTab("home")}
              onClose={() => setOpen(false)}
            />

            <div className="relative flex-1 overflow-y-auto p-3 space-y-2">
              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-white/[0.04] transition"
                    >
                      <span className="grid place-items-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-primary/30 border border-white/10 text-white text-[11px] font-extrabold shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[12.5px] font-bold text-white">{f.q}</span>
                      <ChevronRight
                        className={`h-4 w-4 text-white/70 transition-transform ${
                          isOpen ? "rotate-90 text-white" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pl-[3.25rem] text-[12px] text-white/75 leading-relaxed animate-fade-in">
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setTab("ai")}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-500/15 to-primary/15 hover:from-violet-500/25 hover:to-primary/25 px-3 py-3 text-[12.5px] font-extrabold text-white transition"
              >
                
                আপনার প্রশ্ন খুঁজে পাননি? AI-কে জিজ্ঞাসা করুন
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <BottomTabs tab={tab} setTab={setTab} />
          </div>
        </div>
      )}

      {/* === AI CHAT TAB === */}
      {open && tab === "ai" && (
        <div className={PANEL + " h-[min(640px,calc(100vh-1.5rem))]"}>
          <div className={SHELL + " h-full flex flex-col"}>
            <div className="pointer-events-none absolute -top-24 -left-20 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-aqua/30 blur-3xl" />

            <PanelHeader
              title="AI Assistant"
              subtitle={loading ? "Typing…" : "Online · তাৎক্ষণিক রেসপন্স"}
              icon={<Bot className="h-5 w-5" />}
              gradient="from-violet-500 via-fuchsia-500 to-purple-600"
              onBack={() => setTab("home")}
              onClose={() => setOpen(false)}
              showOnlineDot
            />

            {/* Messages */}
            <div
              ref={scrollRef}
              className="relative flex-1 overflow-y-auto px-3 py-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white ring-2 ring-white/10">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/10 px-3.5 py-2.5 text-[13px] text-white/90 max-w-[85%] leading-relaxed">
                      আসসালামু আলাইকুম! 👋
                      <br />
                      আমি AccessNow-এর AI সহকারী। প্রোডাক্ট, পেমেন্ট, ডেলিভারি — যেকোনো বিষয়ে জিজ্ঞাসা করুন।
                    </div>
                  </div>

                  <div className="pl-10 space-y-2">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-white/70">
                      জনপ্রিয় প্রশ্ন
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="text-[11.5px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/15 text-white/85 hover:bg-white/[0.08] hover:border-primary/50 hover:text-white transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pl-10">
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                      <span className="text-[11px] text-emerald-100/80">
                        100% সিকিউর — আপনার মেসেজ এনক্রিপ্টেড
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`grid place-items-center h-8 w-8 shrink-0 rounded-full ring-2 ring-white/10 ${
                      m.role === "user"
                        ? "bg-white/10 text-white"
                        : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                    }`}
                  >
                    {m.role === "user" ? (
                      <User2 className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </span>
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-500 to-primary text-white shadow-[0_10px_25px_-10px_rgba(124,58,237,0.6)]"
                        : "rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 text-white/95"
                    }`}
                  >
                    {m.content || (loading ? "…" : "")}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-end gap-2">
                  <span className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white ring-2 ring-white/10">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 px-3.5 py-3 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="relative border-t border-white/10 bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 transition pl-4 pr-1.5 py-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="আপনার মেসেজ লিখুন…"
                  className="flex-1 h-9 bg-transparent outline-none text-[13px] text-white placeholder:text-white/65"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-primary to-aqua text-white disabled:opacity-40 hover:scale-105 transition shrink-0 shadow-[0_8px_20px_-6px_rgba(124,58,237,0.7)]"
                  aria-label="Send"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-[10px] text-white/65">
                  Powered by AI · বাংলায় সাপোর্টেড
                </div>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 transition"
                >
                  মানুষের সাথে কথা বলুন →
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function PanelHeader({
  title,
  subtitle,
  icon,
  gradient,
  onBack,
  onClose,
  showOnlineDot,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  onBack: () => void;
  onClose: () => void;
  showOnlineDot?: boolean;
}) {
  return (
    <div className="relative px-4 pt-4 pb-3.5 border-b border-white/10 flex items-center gap-2.5">
      <button
        onClick={onBack}
        className="grid place-items-center h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition shrink-0"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="relative shrink-0">
        <div
          className={`grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg ring-1 ring-white/15`}
        >
          {icon}
        </div>
        {showOnlineDot && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070922]">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
          </span>
        )}
      </div>
      <div className="flex-1 leading-tight min-w-0">
        <div className="text-[14.5px] font-extrabold text-white truncate">{title}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {showOnlineDot && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span className="text-[11px] font-semibold text-white/70 truncate">{subtitle}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="grid place-items-center h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition shrink-0"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function BottomTabs({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "হোম", icon: <Headphones className="h-4 w-4" /> },
    { id: "ai", label: "চ্যাট", icon: <MessageCircleMore className="h-4 w-4" /> },
    { id: "faq", label: "হেল্প", icon: <HelpCircle className="h-4 w-4" /> },
  ];
  return (
    <div className="relative border-t border-white/10 bg-white/[0.02] grid grid-cols-3">
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-bold transition ${
              active ? "text-white" : "text-white/70 hover:text-white/80"
            }`}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-violet-500 to-aqua" />
            )}
            {it.icon}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
