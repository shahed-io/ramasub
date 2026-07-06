import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Sparkles, Send, Bot, User, Loader2, MessageSquare, PenLine,
  BarChart3, Users as UsersIcon, Copy, Trash2, Wand2,
} from "lucide-react";
import { adminChat, generateContent, analyticsAsk } from "@/lib/ai-command.functions";

export const Route = createFileRoute("/Mahbub214/ai-command")({
  component: AICommandCenter,
});

type Tab = "admin" | "customer" | "content" | "analytics";
type ChatMsg = { role: "user" | "assistant"; content: string };

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; grad: string }> = [
  { id: "admin", label: "Admin Assistant", icon: <Bot className="w-4 h-4" />, grad: "from-violet-500 to-fuchsia-500" },
  { id: "customer", label: "Customer Bot", icon: <UsersIcon className="w-4 h-4" />, grad: "from-emerald-500 to-teal-500" },
  { id: "content", label: "Content Studio", icon: <PenLine className="w-4 h-4" />, grad: "from-amber-500 to-orange-500" },
  { id: "analytics", label: "Analytics Insights", icon: <BarChart3 className="w-4 h-4" />, grad: "from-sky-500 to-blue-600" },
];

function AICommandCenter() {
  const [tab, setTab] = useState<Tab>("admin");
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition " +
                (active
                  ? `bg-gradient-to-r ${t.grad} text-white shadow`
                  : "text-slate-600 hover:bg-slate-100")
              }
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "admin" && (
        <ChatPanel
          key="admin"
          storageKey="ai-cc-admin"
          placeholder="যেমনঃ গতকালের orders দেখাও, top 5 selling product কোনগুলো?, pending order কতগুলো?"
          quickPrompts={[
            "শেষ ৩০ দিনের total revenue কত?",
            "Top 5 selling products",
            "Pending orders দেখাও",
            "আজকের নতুন কাস্টমার কতজন?",
          ]}
        />
      )}

      {tab === "customer" && (
        <ChatPanel
          key="customer"
          storageKey="ai-cc-customer"
          placeholder="Customer এর প্রশ্ন type করুন যেটার উত্তর AI দেবে..."
          systemOverride={`You are Rama Sub's customer support assistant. You help buyers of digital subscriptions (Netflix, ChatGPT, Canva, etc.) in Bangladesh.
- Reply in the customer's language (Bangla/English).
- You can query real orders & products via tools.
- Never share credentials in plain chat — direct them to their account page.
- Be warm, quick, and helpful. Currency ৳.`}
          quickPrompts={[
            "আমার অর্ডার এখন কোথায়?",
            "Netflix subscription এর price কত?",
            "Refund কিভাবে পাব?",
          ]}
          headerNote="এটা customer-facing bot এর test panel। এখান থেকে test করুন — public site এ deploy আলাদা কাজ।"
        />
      )}

      {tab === "content" && <ContentStudio />}

      {tab === "analytics" && <AnalyticsPanel />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Chat panel (used for Admin + Customer tabs)
// ─────────────────────────────────────────────────────────────────────

function ChatPanel({
  storageKey,
  placeholder,
  quickPrompts = [],
  systemOverride,
  headerNote,
}: {
  storageKey: string;
  placeholder: string;
  quickPrompts?: string[];
  systemOverride?: string;
  headerNote?: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const run = useServerFn(adminChat);

  // load persisted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, storageKey]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await run({ data: { messages: next, system: systemOverride } });
      setMessages((cur) => [...cur, { role: "assistant", content: res.text || "(no response)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setMessages((cur) => [...cur, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {headerNote && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          💡 {headerNote}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[520px] min-h-[360px] overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <p className="mt-3 text-sm text-slate-600">শুরু করতে একটি প্রশ্ন লিখুন বা নিচের suggestion চাপুন</p>
            {quickPrompts.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm " +
                (m.role === "user"
                  ? "bg-slate-900 text-white rounded-tr-sm"
                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm")
              }
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
            {m.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 grid place-items-center">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex gap-2 justify-start">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> চিন্তা করছি...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={placeholder}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-white font-semibold text-sm shadow disabled:opacity-40 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> পাঠান
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-slate-500 hover:bg-slate-100"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Content Studio
// ─────────────────────────────────────────────────────────────────────

const CONTENT_KINDS: Array<{ id: any; label: string }> = [
  { id: "product_description", label: "Product Description" },
  { id: "seo_title_meta", label: "SEO Title + Meta" },
  { id: "email_marketing", label: "Marketing Email" },
  { id: "telegram_broadcast", label: "Telegram Broadcast" },
  { id: "social_caption", label: "Social Caption (FB/IG)" },
  { id: "review_reply", label: "Review Reply" },
  { id: "whatsapp_message", label: "WhatsApp Message" },
];

function ContentStudio() {
  const [kind, setKind] = useState<any>("product_description");
  const [tone, setTone] = useState<any>("friendly");
  const [language, setLanguage] = useState<any>("bn");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useServerFn(generateContent);

  const generate = async () => {
    if (!brief.trim() || busy) return;
    setBusy(true);
    setOutput("");
    try {
      const res = await run({ data: { kind, brief, tone, language } });
      setOutput(res.text || "(no response)");
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Content Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {CONTENT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
              <option value="mixed">Mixed / Banglish</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="excited">Excited</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Brief / Input</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            placeholder="Product name, features, offer details, target audience — যত বেশি detail দেবেন AI তত ভালো output দেবে"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <button
          onClick={generate}
          disabled={busy || !brief.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white font-semibold text-sm shadow disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Generate
        </button>
      </div>

      {/* Right: output */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Output
          </h3>
          {output && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(output);
                toast.success("Copied!");
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          )}
        </div>
        <div className="min-h-[400px] rounded-lg bg-slate-50 p-3 text-sm">
          {busy && !output && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </div>
          )}
          {!busy && !output && <p className="text-slate-400 italic">Output এখানে দেখাবে</p>}
          {output && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Analytics panel
// ─────────────────────────────────────────────────────────────────────

const ANALYTICS_PROMPTS = [
  "গত ৭ দিনের sales trend এবং কোন day best ছিল সেটা বল",
  "শেষ ৩০ দিনের top selling products এবং revenue analysis দাও",
  "Pending vs completed orders এর অনুপাত কেমন? কী action নিতে পারি?",
  "আজকের কী summary — orders, revenue, notable events?",
];

function AnalyticsPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useServerFn(analyticsAsk);

  const ask = async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setBusy(true);
    setAnswer("");
    try {
      const res = await run({ data: { question: t } });
      setAnswer(res.text || "(no response)");
    } catch (e) {
      setAnswer(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          আপনার question লিখুন
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="যেমনঃ শেষ ১৪ দিনের sales trend কেমন?"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            onClick={() => ask(question)}
            disabled={busy || !question.trim()}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-white font-semibold text-sm shadow disabled:opacity-40 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Ask
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {ANALYTICS_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => { setQuestion(p); ask(p); }}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 hover:bg-sky-100"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-h-[300px]">
        {busy && !answer && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Data fetch করছি এবং analyze করছি...
          </div>
        )}
        {!busy && !answer && (
          <p className="text-slate-400 italic text-sm">
            AI insight report এখানে দেখাবে — প্রশ্ন করুন বা উপরের suggestion চাপুন
          </p>
        )}
        {answer && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
