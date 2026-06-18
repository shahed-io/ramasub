import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Headphones,
  Users,
  Bot,
  Phone,
  Moon,
  History,
  Save,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import { DEFAULT_SUPPORT_WIDGET, type SupportWidgetConfig } from "@/hooks/useSupportWidgetConfig";

export const Route = createFileRoute("/admin/live-chat")({
  component: LiveChatPage,
  head: () => ({ meta: [{ title: "Live Chat — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type LiveChatConfig = SupportWidgetConfig & {
  ai_enabled: boolean;
  whatsapp_enabled: boolean;
  phone_enabled: boolean;
  fab_label: string;
  whatsapp_number: string;
  phone_number: string;
  night_mode: boolean;
};

const DEFAULTS: LiveChatConfig = {
  ...DEFAULT_SUPPORT_WIDGET,
  orb_from: "#7d3df0",
  orb_via: "#3540e3",
  orb_to: "#1873ef",
  icon_color: "#ffffff",
  ai_enabled: true,
  whatsapp_enabled: true,
  phone_enabled: true,
  fab_label: "",
  whatsapp_number: "+8801580607614",
  phone_number: "+8801580607614",
  night_mode: false,
};

type TabKey = "general" | "ai" | "whatsapp" | "phone" | "night" | "history";

function LiveChatPage() {
  const { t } = useAdminLang();
  const [tab, setTab] = useState<TabKey>("general");
  const [cfg, setCfg] = useState<LiveChatConfig>(DEFAULTS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_records")
        .select("id, data")
        .eq("kind", "support_widget")
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (data) {
        setRecordId(data.id as string);
        setCfg({ ...DEFAULTS, ...((data.data as Partial<LiveChatConfig>) || {}) });
      }
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof LiveChatConfig>(k: K, v: LiveChatConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg };
    let error;
    if (recordId) {
      ({ error } = await supabase.from("admin_records").update({ data: payload }).eq("id", recordId));
    } else {
      const ins = await supabase
        .from("admin_records")
        .insert({ kind: "support_widget", data: payload, is_active: true, sort_order: 0 })
        .select("id")
        .single();
      error = ins.error;
      if (ins.data) setRecordId(ins.data.id as string);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Saved", "সেভ হয়েছে"));
  };

  const resetColors = () => {
    setCfg((c) => ({
      ...c,
      orb_from: DEFAULTS.orb_from,
      orb_via: DEFAULTS.orb_via,
      orb_to: DEFAULTS.orb_to,
      icon_color: DEFAULTS.icon_color,
    }));
    toast.success(t("Colors reset", "কালার রিসেট হয়েছে"));
  };

  const tabs: { key: TabKey; en: string; bn: string; icon: any }[] = [
    { key: "general", en: "General", bn: "সাধারণ", icon: MessageCircle },
    { key: "ai", en: "AI Chat", bn: "AI চ্যাট", icon: Bot },
    { key: "whatsapp", en: "WhatsApp", bn: "WhatsApp", icon: MessageCircle },
    { key: "phone", en: "Phone Call", bn: "ফোন কল", icon: Phone },
    { key: "night", en: "Night Set", bn: "নাইট সেট", icon: Moon },
    { key: "history", en: "History", bn: "হিস্ট্রি", icon: History },
  ];

  const fabGradient = useMemo(
    () => `linear-gradient(135deg, ${cfg.orb_from}, ${cfg.orb_via}, ${cfg.orb_to})`,
    [cfg.orb_from, cfg.orb_via, cfg.orb_to],
  );

  return (
    <div className="space-y-5">
      {/* Header rendered globally by AdminPageHeader */}


      {/* Title + save */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t("Live Chat Settings", "লাইভ চ্যাট সেটিংস")}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t("Customize floating support button and chat options", "ফ্লোটিং সাপোর্ট বাটন এবং চ্যাট অপশন কাস্টমাইজ করুন")}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-md hover:opacity-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("Save", "সেভ করুন")}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-sm">
        {tabs.map(({ key, en, bn, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition ${
                active
                  ? "bg-white text-violet-700 border border-violet-300 shadow-sm ring-1 ring-violet-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(en, bn)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {t("Loading…", "লোড হচ্ছে…")}
        </div>
      ) : (
        <>
          {tab === "general" && (
            <div className="space-y-5">
              {/* Card: General settings */}
              <Card>
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">{t("General Settings", "সাধারণ সেটিংস")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("Master on/off controls for the chat system", "চ্যাট সিস্টেমের মূল অন/অফ কন্ট্রোল")}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  <ToggleRow
                    iconWrap="bg-violet-50 text-violet-600"
                    icon={<Bot className="w-4 h-4" />}
                    title={t("AI Chat Support", "AI চ্যাট সাপোর্ট")}
                    desc={t("Turn AI assistant on/off", "AI সহকারী চালু/বন্ধ করুন")}
                    value={cfg.ai_enabled}
                    onChange={(v) => update("ai_enabled", v)}
                  />
                  <ToggleRow
                    iconWrap="bg-emerald-50 text-emerald-600"
                    icon={<MessageCircle className="w-4 h-4" />}
                    title={t("WhatsApp Support", "WhatsApp সাপোর্ট")}
                    desc={t("Turn WhatsApp chat on/off", "WhatsApp চ্যাট চালু/বন্ধ করুন")}
                    value={cfg.whatsapp_enabled}
                    onChange={(v) => update("whatsapp_enabled", v)}
                  />
                  <ToggleRow
                    iconWrap="bg-sky-50 text-sky-600"
                    icon={<Phone className="w-4 h-4" />}
                    title={t("Phone Call Support", "ফোন কল সাপোর্ট")}
                    desc={t("Turn direct call option on/off", "সরাসরি কল অপশন চালু/বন্ধ করুন")}
                    value={cfg.phone_enabled}
                    onChange={(v) => update("phone_enabled", v)}
                  />
                </div>
              </Card>

              {/* FAB label */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t("FAB Menu Label", "FAB মেনু লেবেল")}
                </label>
                <input
                  value={cfg.fab_label}
                  onChange={(e) => update("fab_label", e.target.value)}
                  placeholder={t("Which one do you prefer?", "কোনটি পছন্দ করবেন?")}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Colors card */}
              <Card>
                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 relative">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t("Support Button Color", "সাপোর্ট বাটনের কালার")}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t(
                        "Customize floating support button gradient & icon color",
                        "ফ্লোটিং সাপোর্ট বাটনের গ্রেডিয়েন্ট ও আইকন কালার পরিবর্তন করুন",
                      )}
                    </p>
                  </div>
                  {/* Live preview FAB */}
                  <div
                    className="shrink-0 w-12 h-12 rounded-full grid place-items-center shadow-lg"
                    style={{ background: fabGradient }}
                  >
                    <MessageCircle className="w-5 h-5" style={{ color: cfg.icon_color }} />
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ColorField label={t("Color 1 (Start)", "কালার ১ (শুরু)")} value={cfg.orb_from} onChange={(v) => update("orb_from", v)} />
                  <ColorField label={t("Color 2 (Middle)", "কালার ২ (মাঝ)")} value={cfg.orb_via} onChange={(v) => update("orb_via", v)} />
                  <ColorField label={t("Color 3 (End)", "কালার ৩ (শেষ)")} value={cfg.orb_to} onChange={(v) => update("orb_to", v)} />
                  <ColorField label={t("Icon Color", "আইকন কালার")} value={cfg.icon_color} onChange={(v) => update("icon_color", v)} />
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={resetColors}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 hover:bg-slate-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t("Reset default colors", "ডিফল্ট কালার রিসেট করুন")}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === "ai" && (
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("AI Chat", "AI চ্যাট")}</h3>
                <ToggleRow
                  iconWrap="bg-violet-50 text-violet-600"
                  icon={<Bot className="w-4 h-4" />}
                  title={t("Enable AI assistant", "AI সহকারী চালু করুন")}
                  desc={t("Customers can chat with the AI assistant", "কাস্টমাররা AI সহকারীর সাথে চ্যাট করতে পারবেন")}
                  value={cfg.ai_enabled}
                  onChange={(v) => update("ai_enabled", v)}
                />
              </div>
            </Card>
          )}

          {tab === "whatsapp" && (
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("WhatsApp", "WhatsApp")}</h3>
                <ToggleRow
                  iconWrap="bg-emerald-50 text-emerald-600"
                  icon={<MessageCircle className="w-4 h-4" />}
                  title={t("Enable WhatsApp", "WhatsApp চালু করুন")}
                  desc={t("Show WhatsApp option in the chat menu", "চ্যাট মেনুতে WhatsApp অপশন দেখান")}
                  value={cfg.whatsapp_enabled}
                  onChange={(v) => update("whatsapp_enabled", v)}
                />
                <Field
                  label={t("WhatsApp number", "WhatsApp নম্বর")}
                  value={cfg.whatsapp_number}
                  onChange={(v) => update("whatsapp_number", v)}
                  placeholder="+8801XXXXXXXXX"
                />
              </div>
            </Card>
          )}

          {tab === "phone" && (
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("Phone Call", "ফোন কল")}</h3>
                <ToggleRow
                  iconWrap="bg-sky-50 text-sky-600"
                  icon={<Phone className="w-4 h-4" />}
                  title={t("Enable phone call", "ফোন কল চালু করুন")}
                  desc={t("Show direct call option", "সরাসরি কল অপশন দেখান")}
                  value={cfg.phone_enabled}
                  onChange={(v) => update("phone_enabled", v)}
                />
                <Field
                  label={t("Phone number", "ফোন নম্বর")}
                  value={cfg.phone_number}
                  onChange={(v) => update("phone_number", v)}
                  placeholder="+8801XXXXXXXXX"
                />
              </div>
            </Card>
          )}

          {tab === "night" && (
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("Night Mode", "নাইট মোড")}</h3>
                <ToggleRow
                  iconWrap="bg-indigo-50 text-indigo-600"
                  icon={<Moon className="w-4 h-4" />}
                  title={t("Night auto-reply", "নাইট অটো-রিপ্লাই")}
                  desc={t("Send an after-hours auto reply", "অফ-আওয়ারে অটো রিপ্লাই পাঠান")}
                  value={cfg.night_mode}
                  onChange={(v) => update("night_mode", v)}
                />
              </div>
            </Card>
          )}

          {tab === "history" && <ChatHistoryTab />}
        </>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">{children}</div>;
}

function ToggleRow({
  iconWrap,
  icon,
  title,
  desc,
  value,
  onChange,
}: {
  iconWrap: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${iconWrap}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-violet-600" : "bg-slate-200"
        }`}
        aria-pressed={value}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 h-11 px-2 rounded-xl border border-slate-200 bg-white">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-full bg-transparent text-sm text-slate-700 font-mono focus:outline-none"
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
    </div>
  );
}

type ChatRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  visitor_label: string | null;
  created_at: string;
  user_id: string | null;
};

type ChatSession = {
  id: string;
  label: string | null;
  user_id: string | null;
  messages: ChatRow[];
  last_at: string;
};

function ChatHistoryTab() {
  const { t } = useAdminLang();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("live_chat_messages" as any)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const map = new Map<string, ChatSession>();
    for (const r of (data ?? []) as unknown as ChatRow[]) {
      const s = map.get(r.session_id) ?? {
        id: r.session_id,
        label: r.visitor_label,
        user_id: r.user_id,
        messages: [],
        last_at: r.created_at,
      };
      s.messages.push(r);
      if (r.visitor_label) s.label = r.visitor_label;
      if (r.created_at > s.last_at) s.last_at = r.created_at;
      map.set(r.session_id, s);
    }
    const list = Array.from(map.values()).sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
    setSessions(list);
    setActive((prev) => prev ?? list[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-live-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = sessions.find((s) => s.id === active) ?? null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const deleteSession = async (id: string) => {
    if (!confirm(t("Delete this chat?", "এই চ্যাটটি মুছবেন?"))) return;
    const { error } = await supabase.from("live_chat_messages" as any).delete().eq("session_id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    setSessions((p) => p.filter((s) => s.id !== id));
    if (active === id) setActive(null);
  };

  if (loading) {
    return (
      <Card>
        <div className="p-10 text-center text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          {t("Loading…", "লোড হচ্ছে…")}
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="p-10 text-center text-sm text-slate-500">
          <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
          {t("No chat history yet.", "এখনও কোনো চ্যাট হিস্ট্রি নেই।")}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
      <Card>
        <div className="p-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
          {t("Sessions", "সেশন")} · {sessions.length}
        </div>
        <div className="max-h-[520px] overflow-auto divide-y divide-slate-100">
          {sessions.map((s) => {
            const userMsg = s.messages.find((m) => m.role === "user");
            const preview = userMsg?.content ?? s.messages[0]?.content ?? "";
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full text-left p-3 transition ${
                  active === s.id ? "bg-violet-50/70" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {s.label || t("Guest", "অতিথি")} · {s.messages.length} {t("msg", "মেসেজ")}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{fmt(s.last_at).split(",")[0]}</span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{preview}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        {current ? (
          <div className="flex flex-col h-[560px]">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {current.label || t("Guest", "অতিথি")}
                </div>
                <div className="text-xs text-slate-500">
                  {current.id.slice(0, 8)} · {fmt(current.last_at)}
                </div>
              </div>
              <button
                onClick={() => deleteSession(current.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 h-8 rounded-lg hover:bg-rose-50"
              >
                {t("Delete", "মুছুন")}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50/50">
              {current.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-md"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                    }`}
                  >
                    {m.content}
                    <div className={`text-[10px] mt-1 ${m.role === "user" ? "text-white/70" : "text-slate-400"}`}>
                      {fmt(m.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            {t("Select a session", "একটি সেশন নির্বাচন করুন")}
          </div>
        )}
      </Card>
    </div>
  );
}
