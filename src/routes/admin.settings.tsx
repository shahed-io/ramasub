import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Save, Loader2, Eye, EyeOff, Plus, Send, Mail, MessageCircle,
  Sparkles, Info, ShieldCheck, Database, ExternalLink, RefreshCcw,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: GeneralSettingsPage,
});

type SettingsData = {
  site_name?: string;
  support_email?: string;
  whatsapp_number?: string;
  address?: string;
  currency_code?: string;
  currency_symbol?: string;
  minimum_order_amount?: number;
  order_number_prefix?: string;
  gemini_keys?: string[];
  openai_key?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  admin_email?: string;
  whatsapp_notify_number?: string;
};

/* ── Tone system: stronger tints + darker text for readability ── */
const TONE = {
  violet:  { bg: "bg-violet-100",    text: "text-violet-700",    border: "border-violet-200",    soft: "bg-violet-50",    ink: "text-violet-900" },
  sky:     { bg: "bg-sky-100",       text: "text-sky-700",       border: "border-sky-200",       soft: "bg-sky-50",       ink: "text-sky-900" },
  amber:   { bg: "bg-amber-100",     text: "text-amber-700",     border: "border-amber-200",     soft: "bg-amber-50",     ink: "text-amber-900" },
  emerald: { bg: "bg-emerald-100",   text: "text-emerald-700",   border: "border-emerald-200",   soft: "bg-emerald-50",   ink: "text-emerald-900" },
  fuchsia: { bg: "bg-fuchsia-100",  text: "text-fuchsia-700",  border: "border-fuchsia-200",  soft: "bg-fuchsia-50",  ink: "text-fuchsia-900" },
  slate:   { bg: "bg-slate-200",      text: "text-slate-700",      border: "border-slate-300",      soft: "bg-slate-100",    ink: "text-slate-800" },
} as const;

type ToneKey = keyof typeof TONE;

function GeneralSettingsPage() {
  const [data, setData] = useState<SettingsData>({});
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("admin_records").select("*").eq("kind", "site_settings").limit(1);
    if (error) toast.error(error.message);
    const row = rows?.[0];
    if (row) {
      setRecordId(row.id);
      setData((row.data ?? {}) as SettingsData);
    } else {
      setData({
        currency_code: "BDT",
        currency_symbol: "৳",
        minimum_order_amount: 0,
        order_number_prefix: "AN",
        gemini_keys: [""],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { kind: "site_settings", data: data as never, is_active: true };
    const op = recordId
      ? supabase.from("admin_records").update(payload).eq("id", recordId)
      : supabase.from("admin_records").insert(payload).select().single();
    const { error, data: saved } = await op as any;
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!recordId && saved?.id) setRecordId(saved.id);
    toast.success("সংরক্ষণ সম্পন্ন");
  };

  if (loading) {
    return (
      <div className="grid place-items-center h-64" style={{ color: "var(--admin-muted)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-100 grid place-items-center text-violet-700">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: "var(--admin-ink)" }}>Site Settings</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--admin-muted)" }}>Configure your store settings</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="a-save-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* General Information */}
      <Card icon={<Info className="w-4 h-4" />} title="General Information" tone="violet">
        <Grid2>
          <Field label="Site name">
            <Input value={data.site_name ?? ""} onChange={(v) => set("site_name", v)} placeholder="AccessNow BD" />
          </Field>
          <Field label="Support email">
            <Input type="email" value={data.support_email ?? ""} onChange={(v) => set("support_email", v)} placeholder="info@accessnowbd.com.bd" />
          </Field>
          <Field label="WhatsApp number">
            <Input value={data.whatsapp_number ?? ""} onChange={(v) => set("whatsapp_number", v)} placeholder="01580607614" />
          </Field>
          <Field label="Address">
            <Input value={data.address ?? ""} onChange={(v) => set("address", v)} placeholder="Bangladesh" />
          </Field>
        </Grid2>
      </Card>

      {/* Currency & Payment */}
      <Card icon={<span className="text-base font-bold">৳</span>} title="Currency & Payment" tone="amber">
        <Grid2>
          <Field label="Currency code">
            <Input value={data.currency_code ?? ""} onChange={(v) => set("currency_code", v)} placeholder="BDT" />
          </Field>
          <Field label="Currency symbol">
            <Input value={data.currency_symbol ?? ""} onChange={(v) => set("currency_symbol", v)} placeholder="৳" />
          </Field>
          <Field label="Minimum order amount">
            <Input
              type="number"
              value={String(data.minimum_order_amount ?? 0)}
              onChange={(v) => set("minimum_order_amount", Number(v) || 0)}
              placeholder="0"
            />
          </Field>
        </Grid2>
      </Card>

      {/* Order Settings */}
      <Card icon={<Database className="w-4 h-4" />} title="Order Settings" tone="sky">
        <Field label="Order number prefix">
          <Input value={data.order_number_prefix ?? ""} onChange={(v) => set("order_number_prefix", v)} placeholder="AN" />
        </Field>
      </Card>

      {/* AI API */}
      <Card icon={<Sparkles className="w-4 h-4" />} title="AI API কনফিগারেশন" tone="fuchsia">
        <p className="text-xs mb-3" style={{ color: "var(--admin-muted)" }}>
          ChatGPT (OpenAI) ও Google Gemini — দুটোর যেকোনো একটার কী থাকলেই কাজ করবে।
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--admin-ink)" }}>🔮 Google Gemini</h4>
          <KeyList
            keys={data.gemini_keys ?? [""]}
            onChange={(arr) => set("gemini_keys", arr)}
            placeholder="Gemini API key (AIza...)"
            hint="একাধিক কী যোগ করতে পারেন। লিমিট শেষ হলে পরের কী ব্যবহৃত হবে।"
            link={{ label: "Gemini Studio থেকে কী নিন", href: "https://aistudio.google.com/app/apikey" }}
          />
        </div>

        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--admin-ink)" }}>🧠 OpenAI (ChatGPT)</h4>
          <SecretInput
            value={data.openai_key ?? ""}
            onChange={(v) => set("openai_key", v)}
            placeholder="sk-..."
          />
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
             className="text-xs inline-flex items-center gap-1 hover:underline"
             style={{ color: "var(--admin-primary)" }}>
            OpenAI ড্যাশবোর্ড থেকে কী নিন <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <InfoBox tone="amber">
          <p className="font-semibold">⚡ টিপস:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>প্রথমে Gemini ট্রাই করা হবে — ফ্রি কোটা বেশি।</li>
            <li>Gemini ফেল হলে OpenAI fallback হিসেবে কাজ করবে।</li>
            <li>সব কী নিরাপদে এনক্রিপ্টেড আকারে আমাদের ডাটাবেসে থাকে।</li>
          </ul>
        </InfoBox>
      </Card>

      {/* Telegram */}
      <Card icon={<Send className="w-4 h-4" />} title="Telegram অর্ডার নোটিফিকেশন" tone="sky">
        <p className="text-xs mb-3" style={{ color: "var(--admin-muted)" }}>নতুন অর্ডার এলে Telegram-এ ইনস্ট্যান্ট নোটিফিকেশন</p>
        <Grid2>
          <Field label="Telegram Bot Token">
            <SecretInput value={data.telegram_bot_token ?? ""} onChange={(v) => set("telegram_bot_token", v)} placeholder="123456:ABC-..." />
          </Field>
          <Field label="Chat ID">
            <div className="flex gap-2">
              <Input value={data.telegram_chat_id ?? ""} onChange={(v) => set("telegram_chat_id", v)} placeholder="-1001234567890" />
              <button
                type="button"
                onClick={() => testTelegram(data.telegram_bot_token, data.telegram_chat_id)}
                className="a-save-btn shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> টেস্ট
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--admin-muted)" }}>@userinfobot থেকে Chat ID নিন</p>
          </Field>
        </Grid2>

        <InfoBox tone="sky">
          <p className="font-semibold mb-1">📌 কিভাবে সেট আপ করবেন:</p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>Telegram-এ <b>@BotFather</b>-এর সাথে চ্যাট করে নতুন বট তৈরি করুন → Bot Token পাবেন</li>
            <li>আপনার বটকে যে গ্রুপ/চ্যানেলে অ্যাড করেছেন সেটার Chat ID নিন (@userinfobot)</li>
            <li>উপরে দুটো বসিয়ে <b>"টেস্ট"</b> ক্লিক করুন</li>
          </ol>
        </InfoBox>
      </Card>

      {/* Admin Email */}
      <Card icon={<Mail className="w-4 h-4" />} title="Admin Email নোটিফিকেশন" tone="violet">
        <p className="text-xs mb-3" style={{ color: "var(--admin-muted)" }}>নতুন অর্ডার ও কাস্টমার মেসেজ এই ইমেইলে যাবে</p>
        <Field label="Admin notification email">
          <Input type="email" value={data.admin_email ?? ""} onChange={(v) => set("admin_email", v)} placeholder="admin@example.com" />
        </Field>
        <p className="text-[11px] mt-1" style={{ color: "var(--admin-muted)" }}>একাধিক ইমেইল কমা দিয়ে লিখুন</p>
      </Card>

      {/* WhatsApp Notification */}
      <Card icon={<MessageCircle className="w-4 h-4" />} title="WhatsApp অর্ডার নোটিফিকেশন" tone="emerald">
        <p className="text-xs mb-3" style={{ color: "var(--admin-muted)" }}>নতুন অর্ডার এলে WhatsApp-এ নোটিফিকেশন আসবে</p>
        <Field label="WhatsApp নম্বর (দেশ কোড সহ)">
          <div className="flex gap-2">
            <Input value={data.whatsapp_notify_number ?? ""} onChange={(v) => set("whatsapp_notify_number", v)} placeholder="8801580607614" />
            <button
              type="button"
              onClick={() => testWhatsApp(data.whatsapp_notify_number)}
              className="a-save-btn shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> টেস্ট
            </button>
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--admin-muted)" }}>উদাহরণ: 8801XXXXXXXXX (+ ছাড়া)</p>
        </Field>

        <InfoBox tone="emerald">
          <p className="font-semibold mb-1">✅ যেভাবে কাজ করবে:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>নতুন অর্ডার এলেই এই নম্বরে WhatsApp মেসেজ যাবে (অর্ডার সামারি সহ)</li>
            <li>কাস্টমার চেকআউটে যা যা লিখেছে সব তথ্য থাকবে</li>
            <li>মোবাইল থেকে কাস্টমারকে সরাসরি WhatsApp করতে পারবেন</li>
            <li>Currency সহ অর্ডারের total amount দেখাবে</li>
          </ul>
        </InfoBox>
      </Card>

      {/* Admin Account */}
      <Card icon={<ShieldCheck className="w-4 h-4" />} title="Admin Account" tone="slate">
        <p className="text-xs" style={{ color: "var(--admin-muted)" }}>Manage admin user access from Lovable Cloud dashboard</p>
        <InfoBox tone="violet">
          নতুন অ্যাডমিন যোগ করতে: Lovable Cloud → Database → <b>user_roles</b> → user_id সহ role = <b>admin</b> insert করুন
        </InfoBox>
      </Card>

      {/* Bottom Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="a-save-btn h-11 px-6"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ============================== Helpers ============================== */

async function testTelegram(token?: string, chatId?: string) {
  if (!token || !chatId) return toast.error("Bot Token ও Chat ID দুটোই দিন");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ AccessNow BD — Telegram নোটিফিকেশন সফলভাবে কনফিগার হয়েছে!",
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || "Failed");
    toast.success("Telegram-এ টেস্ট মেসেজ গেছে ✅");
  } catch (e: any) {
    toast.error("ব্যর্থ: " + e.message);
  }
}

function testWhatsApp(num?: string) {
  if (!num) return toast.error("WhatsApp নম্বর দিন");
  const msg = encodeURIComponent("✅ AccessNow BD — WhatsApp নোটিফিকেশন কনফিগার সফল!");
  window.open(`https://wa.me/${num.replace(/\D/g, "")}?text=${msg}`, "_blank");
}

/* ============================== UI Primitives ============================== */

function Card({ icon, title, tone = "violet", children }: { icon: React.ReactNode; title: string; tone?: ToneKey; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <section className="a-card overflow-hidden" style={{ borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: "var(--admin-primary)" }}>
      <header className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--admin-border)" }}>
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${t.bg} ${t.text}`}>
          {icon}
        </span>
        <h3 className="text-sm font-bold" style={{ color: "var(--admin-ink)" }}>{title}</h3>
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function InfoBox({ tone = "violet", children }: { tone?: ToneKey; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <div className={`mt-4 rounded-xl border p-3.5 text-xs space-y-1 ${t.soft} ${t.border} ${t.ink}`}>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--admin-text)" }}>{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 rounded-xl border px-3.5 text-sm transition focus:outline-none focus:ring-2"
      style={{
        background: "#ffffff",
        color: "var(--admin-ink)",
        borderColor: "var(--admin-border)",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#c4b5fd"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.35)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--admin-border)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border pl-3.5 pr-10 text-sm font-mono transition focus:outline-none focus:ring-2"
        style={{
          background: "#ffffff",
          color: "var(--admin-ink)",
          borderColor: "var(--admin-border)",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#c4b5fd"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.35)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--admin-border)"; e.currentTarget.style.boxShadow = "none"; }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-lg transition"
        style={{ color: "var(--admin-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--admin-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function KeyList({ keys, onChange, placeholder, hint, link }: {
  keys: string[];
  onChange: (arr: string[]) => void;
  placeholder?: string;
  hint?: string;
  link?: { label: string; href: string };
}) {
  const list = keys.length ? keys : [""];
  const set = (i: number, v: string) => {
    const next = list.slice();
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...list, ""]);
  const del = (i: number) => {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [""]);
  };
  return (
    <div className="space-y-2">
      {list.map((k, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-bold w-14" style={{ color: "var(--admin-muted)" }}>API Key {i + 1}</span>
          <div className="flex-1">
            <SecretInput value={k} onChange={(v) => set(i, v)} placeholder={placeholder} />
          </div>
          <button
            type="button"
            onClick={() => del(i)}
            className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border transition"
            style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ffe4e6"; e.currentTarget.style.color = "#e11d48"; e.currentTarget.style.borderColor = "#fecdd3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--admin-muted)"; e.currentTarget.style.borderColor = "var(--admin-border)"; }}
            title="রিসেট"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 pt-1">
        {hint && <p className="text-[11px]" style={{ color: "var(--admin-muted)" }}>{hint}</p>}
        <button
          type="button"
          onClick={add}
          className="ml-auto inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition"
          style={{ background: "var(--admin-hover)", color: "var(--admin-text)" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.97)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          <Plus className="w-3 h-3" /> আরেকটি কী
        </button>
      </div>
      {link && (
        <a href={link.href} target="_blank" rel="noreferrer"
           className="text-xs inline-flex items-center gap-1 hover:underline"
           style={{ color: "var(--admin-primary)" }}>
          {link.label} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
