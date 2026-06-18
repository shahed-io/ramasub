import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { MessageCircle, Mail, Clock, MapPin, Send, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — AccessNow BD" },
      { name: "description", content: "Reach AccessNow BD via WhatsApp, email, or the contact form. Office hours 11 AM – 11 PM." },
      { property: "og:title", content: "Contact AccessNow BD" },
      { property: "og:description", content: "We're here to help — WhatsApp, email, or send us a message." },
      { property: "og:url", content: "https://accessnowbd.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://accessnowbd.com/contact" }],
  }),
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Max 100 characters"),
  email: z.string().trim().email("Enter a valid email").max(255, "Max 255 characters"),
  subject: z.string().trim().max(150, "Max 150 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(1000, "Max 1000 characters"),
});

type ContactForm = { name: string; email: string; subject: string; message: string };
type FieldKey = keyof ContactForm;

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<ContactForm>({ name: "", email: "", subject: "", message: "" });
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({ name: false, email: false, subject: false, message: false });

  const errors = useMemo(() => {
    const result = contactSchema.safeParse(form);
    if (result.success) return {} as Partial<Record<FieldKey, string>>;
    const out: Partial<Record<FieldKey, string>> = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as FieldKey;
      if (!out[k]) out[k] = issue.message;
    }
    return out;
  }, [form]);

  const valid = Object.keys(errors).length === 0;
  const update = (k: FieldKey, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!valid) return;
    setSent(true);
  };

  return (
    <div className="min-h-screen">

      <section className="relative bg-[#07071a] text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/35 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-[var(--color-aqua)]/35 blur-[140px]" />
        <div className="relative mx-auto max-w-[1440px] px-4 md:px-10 py-14 md:py-20">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800 }}>
            যোগাযোগ করুন
          </h1>
          <p className="mt-3 text-white/75 max-w-xl">যেকোনো প্রশ্ন বা সাপোর্টের জন্য — আমরা আছি।</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 md:px-10 py-12 grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <InfoCard icon={MessageCircle} title="WhatsApp" desc="দ্রুততম রেসপন্স — 15 মিনিটের মধ্যে।"
            action={<a href="https://wa.me/8801580607614" className="text-primary font-bold hover:underline">+880 1580-607614</a>} />
          <InfoCard icon={Mail} title="Email" desc="বিস্তারিত প্রশ্নের জন্য।"
            action={<a href="mailto:hello@accessnowbd.com" className="text-primary font-bold hover:underline">hello@accessnowbd.com</a>} />
          <InfoCard icon={Clock} title="Office Hours" desc="প্রতিদিন খোলা।"
            action={<span className="font-bold">11 AM – 11 PM</span>} />
          <InfoCard icon={MapPin} title="Location" desc="Online-first business।"
            action={<span className="font-bold">Dhaka, Bangladesh</span>} />
        </div>

        <form onSubmit={onSubmit} noValidate className="glass-strong rounded-3xl p-6 md:p-8 space-y-4">
          {sent ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
              <h3 className="mt-3 text-lg font-bold">মেসেজ পাঠানো হয়েছে!</h3>
              <p className="text-sm text-muted-foreground mt-1">আমরা শীঘ্রই উত্তর দেব।</p>
              <button type="button" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); setTouched({ name: false, email: false, subject: false, message: false }); }} className="mt-5 h-10 px-5 rounded-full bg-aurora text-white text-sm font-bold">
                Send another
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-extrabold">Send us a message</h2>

              <ValidatedField label="আপনার নাম" name="name" value={form.name}
                onChange={(v) => update("name", v)} onBlur={() => blur("name")}
                error={touched.name ? errors.name : undefined} required maxLength={100} />
              <ValidatedField label="ইমেইল" name="email" type="email" value={form.email}
                onChange={(v) => update("email", v)} onBlur={() => blur("email")}
                error={touched.email ? errors.email : undefined} required maxLength={255} />
              <ValidatedField label="বিষয়" name="subject" value={form.subject}
                onChange={(v) => update("subject", v)} onBlur={() => blur("subject")}
                error={touched.subject ? errors.subject : undefined} maxLength={150} />
              <ValidatedField label="মেসেজ" name="message" multiline value={form.message}
                onChange={(v) => update("message", v)} onBlur={() => blur("message")}
                error={touched.message ? errors.message : undefined} required maxLength={1000} />

              <button
                type="submit"
                disabled={!valid}
                aria-disabled={!valid}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-aurora text-white font-bold glow-violet hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="w-4 h-4" /> Send Message
              </button>
            </>
          )}
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

function InfoCard({ icon: Icon, title, desc, action }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-start gap-4">
      <div className="grid place-items-center w-12 h-12 shrink-0 rounded-2xl bg-aurora text-white glow-violet"><Icon className="w-5 h-5" /></div>
      <div>
        <div className="text-base font-bold tracking-tight">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        <div className="mt-2 text-sm">{action}</div>
      </div>
    </div>
  );
}

interface ValidatedFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  required?: boolean;
  type?: string;
  multiline?: boolean;
  maxLength?: number;
}

function ValidatedField({ label, name, value, onChange, onBlur, error, required, type = "text", multiline, maxLength }: ValidatedFieldProps) {
  const errId = `${name}-error`;
  const baseCls = cn(
    "w-full px-4 rounded-xl bg-white border outline-none focus:ring-2 focus:ring-primary/30",
    error ? "border-destructive ring-2 ring-destructive/40" : "border-border",
    multiline ? "py-3 resize-none" : "h-11",
  );
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      <div className="mt-1.5">
        {multiline ? (
          <textarea
            name={name} rows={5} value={value}
            onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
            required={required} maxLength={maxLength}
            aria-invalid={!!error} aria-describedby={error ? errId : undefined}
            className={baseCls}
          />
        ) : (
          <input
            name={name} type={type} value={value}
            onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
            required={required} maxLength={maxLength}
            aria-invalid={!!error} aria-describedby={error ? errId : undefined}
            className={baseCls}
          />
        )}
      </div>
      {error && (
        <span id={errId} role="alert" className="block mt-1.5 text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
