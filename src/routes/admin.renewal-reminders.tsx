import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Loader2,
  Sparkles,
  Send,
  Search as SearchIcon,
  Filter as FilterIcon,
  Tag,
  CheckCircle2,
  ChevronDown,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/admin/renewal-reminders")({
  component: RenewalRemindersPage,
  head: () => ({
    meta: [
      { title: "Renewal Reminders — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type OrderItem = {
  slug?: string;
  name?: string;
  qty?: number;
  planPeriod?: string;
};

type OrderRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  items: OrderItem[] | null;
  created_at: string;
  delivered_at: string | null;
};

type Subscription = {
  key: string; // order_id:slug
  order_id: string;
  item_key: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  product_slug: string;
  plan_period: string | null;
  expiry_date: string | null; // ISO date
  last_reminder_at: string | null;
};

type ProductLite = { slug: string; name: string };

const LS_KEY = "renewal_expiry_overrides_v1";

function parsePeriodToDays(period?: string | null): number | null {
  if (!period) return null;
  const s = period.toLowerCase();
  const m = s.match(/(\d+)\s*(month|months|mo|year|years|yr|day|days|week|weeks)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit.startsWith("year") || unit === "yr") return n * 365;
  if (unit.startsWith("month") || unit === "mo") return n * 30;
  if (unit.startsWith("week")) return n * 7;
  return n;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(today: Date, iso: string): number {
  const a = new Date(iso + "T00:00:00");
  const ms = a.getTime() - today.getTime();
  return Math.round(ms / 86400000);
}

function loadOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveOverrides(m: Record<string, string>) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(m));
}

function RenewalRemindersPage() {
  const { t } = useAdminLang();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [lastReminders, setLastReminders] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "expired" | "next7" | "next30" | "future">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Subscription | null>(null);

  // Manual / AI form state
  const [fProductSlug, setFProductSlug] = useState("");
  const [fProductCustom, setFProductCustom] = useState("");
  const [fEmails, setFEmails] = useState("");
  const [fCustomerName, setFCustomerName] = useState("");
  const [fExpiry, setFExpiry] = useState("");
  const [fLanguage, setFLanguage] = useState<"bn" | "en" | "mixed">("bn");
  const [fTone, setFTone] = useState("professional, warm, friendly");
  const [fNotes, setFNotes] = useState("");
  const [fCouponOn, setFCouponOn] = useState(true);
  const [fDiscount, setFDiscount] = useState(15);
  const [fValidDays, setFValidDays] = useState(7);
  const [fOfferText, setFOfferText] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fBody, setFBody] = useState("");
  const [fAutoSend, setFAutoSend] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ord, recs] = await Promise.all([
      supabase
        .from("orders")
        .select("id, full_name, email, phone, status, items, created_at, delivered_at")
        .in("status", ["completed", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("admin_records")
        .select("id, data, updated_at")
        .eq("kind", "renewal_reminder_log")
        .order("updated_at", { ascending: false })
        .limit(2000),
    ]);
    if (ord.error) toast.error(ord.error.message);
    setOrders((ord.data ?? []) as OrderRow[]);
    const log: Record<string, string> = {};
    for (const r of (recs.data ?? []) as Array<{ data: { key?: string; sent_at?: string } }>) {
      const k = r.data?.key;
      const s = r.data?.sent_at;
      if (k && s && !log[k]) log[k] = s;
    }
    setLastReminders(log);
    setOverrides(loadOverrides());
    // products
    const { data: prods } = await supabase
      .from("products")
      .select("slug, name")
      .eq("is_active", true)
      .order("name");
    setProducts((prods ?? []) as ProductLite[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Flatten orders -> subscriptions
  const subscriptions = useMemo<Subscription[]>(() => {
    const out: Subscription[] = [];
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const slug = it.slug || "";
        const key = `${o.id}:${slug}`;
        const startISO = (o.delivered_at || o.created_at || "").slice(0, 10);
        const days = parsePeriodToDays(it.planPeriod);
        const derived = startISO && days ? addDaysISO(startISO + "T00:00:00", days) : null;
        const expiry = overrides[key] ?? derived;
        out.push({
          key,
          order_id: o.id,
          item_key: slug,
          customer_name: o.full_name,
          customer_email: o.email,
          customer_phone: o.phone,
          product_name: it.name || slug,
          product_slug: slug,
          plan_period: it.planPeriod || null,
          expiry_date: expiry,
          last_reminder_at: lastReminders[key] ?? null,
        });
      }
    }
    return out;
  }, [orders, overrides, lastReminders]);

  const stats = useMemo(() => {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    let total = subscriptions.length;
    let expired = 0;
    let next7 = 0;
    let next30 = 0;
    for (const s of subscriptions) {
      if (!s.expiry_date) continue;
      const d = daysBetween(today, s.expiry_date);
      if (d < 0) expired++;
      else if (d <= 7) next7++;
      else if (d <= 30) next30++;
    }
    return { total, expired, next7, next30 };
  }, [subscriptions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    return subscriptions.filter((s) => {
      if (productFilter !== "all" && s.product_slug !== productFilter) return false;
      if (statusFilter !== "all") {
        if (!s.expiry_date) return false;
        const d = daysBetween(today, s.expiry_date);
        if (statusFilter === "expired" && !(d < 0)) return false;
        if (statusFilter === "next7" && !(d >= 0 && d <= 7)) return false;
        if (statusFilter === "next30" && !(d >= 0 && d <= 30)) return false;
        if (statusFilter === "future" && !(d > 30)) return false;
      }
      if (!q) return true;
      return (
        s.customer_name.toLowerCase().includes(q) ||
        s.customer_email.toLowerCase().includes(q) ||
        s.customer_phone.toLowerCase().includes(q) ||
        s.product_name.toLowerCase().includes(q) ||
        s.order_id.toLowerCase().includes(q)
      );
    });
  }, [subscriptions, search, productFilter, statusFilter]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((s) => s.key)));
  };

  const saveOverride = (key: string, date: string | null) => {
    const m = { ...overrides };
    if (date) m[key] = date;
    else delete m[key];
    setOverrides(m);
    saveOverrides(m);
  };

  const logReminder = async (key: string, recipient: string) => {
    const sent_at = new Date().toISOString();
    setLastReminders((p) => ({ ...p, [key]: sent_at }));
    await supabase.from("admin_records").insert({
      kind: "renewal_reminder_log",
      data: { key, sent_at, recipient },
      is_active: true,
    });
  };

  const generateCouponCode = () => {
    const id = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `RENEW-${id}`;
  };

  async function generateAI(): Promise<{ subject: string; body: string } | null> {
    setAiBusy(true);
    try {
      const productName =
        fProductCustom.trim() ||
        products.find((p) => p.slug === fProductSlug)?.name ||
        "your subscription";
      const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
      const daysLeft = fExpiry ? daysBetween(today, fExpiry) : null;
      const coupon = fCouponOn
        ? {
            code: generateCouponCode(),
            discount: Number(fDiscount) || 0,
            validDays: Number(fValidDays) || 7,
            offerText: fOfferText,
          }
        : null;

      const { data, error } = await supabase.functions.invoke("renewal-email-ai", {
        body: {
          product: productName,
          customerName: fCustomerName,
          expiresOn: fExpiry,
          daysLeft,
          language: fLanguage,
          tone: fTone,
          notes: fNotes,
          coupon,
        },
      });
      if (error) throw error;
      const res = data as { subject?: string; body?: string; error?: string };
      if (res.error) throw new Error(res.error);
      if (!res.subject || !res.body) throw new Error("AI returned empty content");
      setFSubject(res.subject);
      setFBody(res.body);
      toast.success(t("Draft ready", "ড্রাফট তৈরি হয়েছে"));
      return { subject: res.subject, body: res.body };
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI error");
      return null;
    } finally {
      setAiBusy(false);
    }
  }

  async function sendOne(opts: {
    recipient: string;
    customerName?: string;
    productName: string;
    expiry?: string | null;
    subject: string;
    body: string;
    key?: string;
    couponCode?: string;
  }) {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const dl = opts.expiry ? daysBetween(today, opts.expiry) : undefined;
    await sendTransactionalEmail({
      templateName: "subscription-expiring",
      recipientEmail: opts.recipient,
      idempotencyKey: `renewal-${opts.key ?? opts.recipient}-${Date.now()}`,
      templateData: {
        name: opts.customerName,
        planName: opts.productName,
        expiresOn: opts.expiry || undefined,
        daysLeft: typeof dl === "number" ? dl : undefined,
        aiBody: opts.body,
        couponCode: opts.couponCode,
        couponDiscount: opts.couponCode ? Number(fDiscount) || 0 : undefined,
        couponValidDays: opts.couponCode ? Number(fValidDays) || 0 : undefined,
        couponOfferText: opts.couponCode ? fOfferText : undefined,
      },
    });
    if (opts.key) await logReminder(opts.key, opts.recipient);
  }

  async function manualSend() {
    const recipients = fEmails
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => /.+@.+\..+/.test(s));
    if (recipients.length === 0) return toast.error(t("Add at least one email", "অন্তত একটি ইমেইল দিন"));

    let draft: { subject: string; body: string } | null = null;
    if (!fBody.trim()) {
      draft = await generateAI();
      if (!draft) return;
    } else {
      draft = { subject: fSubject || t("Renewal reminder", "রিনিউয়াল রিমাইন্ডার"), body: fBody };
    }

    const productName =
      fProductCustom.trim() ||
      products.find((p) => p.slug === fProductSlug)?.name ||
      "your subscription";
    setSendBusy(true);
    let ok = 0;
    for (const r of recipients) {
      try {
        const code = fCouponOn ? generateCouponCode() : undefined;
        await sendOne({
          recipient: r,
          customerName: fCustomerName,
          productName,
          expiry: fExpiry || null,
          subject: draft.subject,
          body: draft.body,
          couponCode: code,
        });
        ok++;
      } catch (e) {
        console.error("send fail", r, e);
      }
    }
    setSendBusy(false);
    if (ok) toast.success(`${ok}/${recipients.length} ${t("sent", "পাঠানো হয়েছে")}`);
    else toast.error(t("Send failed", "পাঠানো যায়নি"));
  }

  async function bulkSend() {
    const targets = visible.filter((s) => selected.has(s.key));
    if (targets.length === 0) return;
    const draft =
      fBody.trim()
        ? { subject: fSubject || t("Renewal reminder", "রিনিউয়াল রিমাইন্ডার"), body: fBody }
        : await generateAI();
    if (!draft) return;
    setSendBusy(true);
    let ok = 0;
    for (const s of targets) {
      try {
        const code = fCouponOn ? generateCouponCode() : undefined;
        await sendOne({
          recipient: s.customer_email,
          customerName: s.customer_name,
          productName: s.product_name,
          expiry: s.expiry_date,
          subject: draft.subject,
          body: draft.body,
          key: s.key,
          couponCode: code,
        });
        ok++;
      } catch (e) {
        console.error("bulk send fail", s.customer_email, e);
      }
    }
    setSendBusy(false);
    setSelected(new Set());
    if (ok) toast.success(`${ok}/${targets.length} ${t("sent", "পাঠানো হয়েছে")}`);
    else toast.error(t("Send failed", "পাঠানো যায়নি"));
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const fmtRel = (iso: string | null) => {
    if (!iso) return t("Never", "কখনও না");
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 86400000;
    if (diff < 1) return t("Today", "আজ");
    if (diff < 2) return t("Yesterday", "গতকাল");
    if (diff < 30) return `${Math.floor(diff)} ${t("days ago", "দিন আগে")}`;
    return d.toLocaleDateString();
  };
  const statusBadge = (s: Subscription) => {
    if (!s.expiry_date)
      return <span className="a-status-pending text-[11px] font-bold px-2.5 py-1 rounded-full">{t("No date", "তারিখ নেই")}</span>;
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const d = daysBetween(today, s.expiry_date);
    if (d < 0)
      return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">{t("Expired", "মেয়াদোত্তীর্ণ")}</span>;
    if (d <= 7)
      return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{d}d {t("left", "বাকি")}</span>;
    if (d <= 30)
      return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{d}d {t("left", "বাকি")}</span>;
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{d}d {t("left", "বাকি")}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Subscription block header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span>📨</span> {t("Subscription Renewal Reminders", "সাবস্ক্রিপশন রিনিউয়াল রিমাইন্ডার")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Track expiring subscriptions and send branded reminder emails to customers — individually or in bulk.",
              "মেয়াদ শেষ হওয়া সাবস্ক্রিপশন ট্র্যাক করুন এবং কাস্টমারদের ব্র্যান্ডেড রিমাইন্ডার পাঠান।",
            )}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t("Refresh", "রিফ্রেশ")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={t("Total tracked", "মোট ট্র্যাকড")} value={stats.total} tone="slate" />
        <StatBox label={t("Expired", "মেয়াদোত্তীর্ণ")} value={stats.expired} tone="rose" />
        <StatBox label={t("Next 7 days", "৭ দিনের মধ্যে")} value={stats.next7} tone="amber" />
        <StatBox label={t("Next 30 days", "৩০ দিনের মধ্যে")} value={stats.next30} tone="violet" />
      </div>

      {/* Manual / AI Reminder */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" /> {t("Manual / AI Reminder", "ম্যানুয়াল / AI রিমাইন্ডার")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "Send to any customer (offline / manual purchase). Pick a product, AI writes a professional reminder, then auto-sends.",
              "যে কোনো কাস্টমারকে পাঠান — প্রোডাক্ট সিলেক্ট করুন, AI ইমেইল লিখবে, তারপর পাঠাবে।",
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>{t("Product", "প্রোডাক্ট")}</Label>
            <ProductSelect
              products={products}
              value={fProductSlug}
              onChange={(v) => {
                setFProductSlug(v);
                const p = products.find((x) => x.slug === v);
                if (p) setFProductCustom("");
              }}
            />
            <input
              value={fProductCustom}
              onChange={(e) => setFProductCustom(e.target.value)}
              placeholder={t("…or type custom product name", "…অথবা কাস্টম প্রোডাক্ট নাম লিখুন")}
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <Label>{t("Customer email(s)", "কাস্টমার ইমেইল")}</Label>
            <textarea
              value={fEmails}
              onChange={(e) => setFEmails(e.target.value)}
              placeholder="customer1@example.com, customer2@example.com&#10;or one email per line"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {t(
                "Separate multiple emails with comma, space, or new line.",
                "একাধিক ইমেইল কমা, স্পেস বা নতুন লাইন দিয়ে আলাদা করুন।",
              )}
            </p>
          </div>

          <div>
            <Label>{t("Customer name", "কাস্টমার নাম")}</Label>
            <input
              value={fCustomerName}
              onChange={(e) => setFCustomerName(e.target.value)}
              placeholder="Optional"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <Label>{t("Expiry date (optional)", "মেয়াদ শেষের তারিখ")}</Label>
            <input
              type="date"
              value={fExpiry}
              onChange={(e) => setFExpiry(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <Label>{t("Language", "ভাষা")}</Label>
            <select
              value={fLanguage}
              onChange={(e) => setFLanguage(e.target.value as "bn" | "en" | "mixed")}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="bn">Bangla (বাংলা)</option>
              <option value="mixed">Bangla + English</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <Label>{t("Tone", "টোন")}</Label>
            <input
              value={fTone}
              onChange={(e) => setFTone(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div className="md:col-span-2">
            <Label>{t("Notes for AI (optional)", "AI-এর জন্য নোট")}</Label>
            <input
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              placeholder="e.g. mention loyalty discount, mention 24/7 support"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        {/* Coupon block */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-violet-900">
            <input
              type="checkbox"
              checked={fCouponOn}
              onChange={(e) => setFCouponOn(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <Tag className="w-4 h-4" />
            {t("Attach a personal one-time discount coupon for this customer", "এই কাস্টমারের জন্য পার্সোনাল ডিসকাউন্ট কুপন")}
          </label>
          {fCouponOn && (
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>{t("Discount %", "ডিসকাউন্ট %")}</Label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={fDiscount}
                  onChange={(e) => setFDiscount(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <Label>{t("Valid for (days)", "মেয়াদ (দিন)")}</Label>
                <input
                  type="number"
                  min={1}
                  value={fValidDays}
                  onChange={(e) => setFValidDays(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <Label>{t("Special offer text (optional)", "অফার টেক্সট")}</Label>
                <input
                  value={fOfferText}
                  onChange={(e) => setFOfferText(e.target.value)}
                  placeholder="e.g. Free 1-month bonus on renewal"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>
              <p className="md:col-span-3 text-[11px] text-violet-700/80">
                {t(
                  "A unique RNW-XXXXX coupon is generated per recipient, locked to their email and the product. One-time use only.",
                  "প্রতি প্রাপকের জন্য আলাদা RNW-XXXXX কুপন তৈরি হবে।",
                )}
              </p>
            </div>
          )}
        </div>

        <div>
          <Label>{t("Email body (AI-generated, editable)", "ইমেইল বডি (AI জেনারেটেড, এডিটেবল)")}</Label>
          <input
            value={fSubject}
            onChange={(e) => setFSubject(e.target.value)}
            placeholder={t("Subject", "সাবজেক্ট")}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <textarea
            value={fBody}
            onChange={(e) => setFBody(e.target.value)}
            rows={7}
            placeholder={t("Click 'Generate with AI' to draft a professional reminder…", "AI ইমেইল ড্রাফট করতে 'Generate with AI' ক্লিক করুন…")}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={fAutoSend}
              onChange={(e) => setFAutoSend(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="font-semibold">{t("Auto-send right after AI generates", "AI জেনারেট হলেই পাঠান")}</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={aiBusy}
              onClick={async () => {
                const draft = await generateAI();
                if (draft && fAutoSend) await manualSend();
              }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-violet-600" />}
              {t("Generate with AI", "AI দিয়ে জেনারেট")}
            </button>
            <button
              type="button"
              disabled={sendBusy || aiBusy}
              onClick={manualSend}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 disabled:opacity-50 shadow-md"
            >
              {sendBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("Generate & Send", "জেনারেট ও সেন্ড")}
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search by customer, email, phone, product, order #", "সার্চ করুন")}
              className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          >
            <option value="all">{t("All products", "সব প্রোডাক্ট")}</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <FilterIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-11 pl-9 pr-7 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 appearance-none"
            >
              <option value="all">{t("All", "সব")}</option>
              <option value="expired">{t("Expired", "মেয়াদোত্তীর্ণ")}</option>
              <option value="next7">{t("Next 7 days", "৭ দিনে")}</option>
              <option value="next30">{t("Next 30 days", "৩০ দিনে")}</option>
              <option value="future">{t("Future", "ভবিষ্যত")}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            disabled={selected.size === 0 || sendBusy}
            onClick={bulkSend}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 disabled:opacity-40 shadow-md"
          >
            {sendBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t("Send Reminder", "রিমাইন্ডার পাঠান")} ({selected.size})
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            {t("Loading…", "লোড হচ্ছে…")}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">{t("No subscriptions match.", "মিল পাওয়া যায়নি।")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === visible.length}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-violet-600"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-bold">{t("Customer", "কাস্টমার")}</th>
                  <th className="px-3 py-3 text-left font-bold">{t("Product", "প্রোডাক্ট")}</th>
                  <th className="px-3 py-3 text-left font-bold">{t("Expiry", "মেয়াদ")}</th>
                  <th className="px-3 py-3 text-left font-bold">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="px-3 py-3 text-left font-bold">{t("Last reminder", "শেষ রিমাইন্ডার")}</th>
                  <th className="px-3 py-3 text-right font-bold">{t("Action", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((s) => (
                  <tr key={s.key} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.key)}
                        onChange={() => toggleSelect(s.key)}
                        className="w-4 h-4 accent-violet-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">{s.customer_name}</div>
                      <div className="text-xs text-slate-500">{s.customer_email}</div>
                      <div className="text-xs text-slate-400">{s.customer_phone}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{s.product_name}</div>
                      <div className="text-[11px] text-slate-400">#ORD-{s.order_id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{fmtDate(s.expiry_date)}</td>
                    <td className="px-3 py-3">{statusBadge(s)}</td>
                    <td className="px-3 py-3 text-slate-600">{fmtRel(s.last_reminder_at)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setEditing(s)}
                        className="text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 h-8 rounded-lg border border-violet-200"
                      >
                        {t("Edit date", "তারিখ এডিট")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit date modal */}
      {editing && (
        <EditDateModal
          sub={editing}
          onClose={() => setEditing(null)}
          onSave={(date) => {
            saveOverride(editing.key, date);
            setEditing(null);
            toast.success(t("Saved", "সংরক্ষিত"));
          }}
        />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">{children}</label>;
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "rose" | "amber" | "violet";
}) {
  const toneCls =
    tone === "rose"
      ? "text-rose-600"
      : tone === "amber"
      ? "text-amber-600"
      : tone === "violet"
      ? "text-violet-700"
      : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

function ProductSelect({
  products,
  value,
  onChange,
}: {
  products: ProductLite[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const current = products.find((p) => p.slug === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-left flex items-center justify-between"
      >
        <span className="truncate text-slate-700">{current?.name || "Search product…"}</span>
        <SearchIcon className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">No products</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => {
                    onChange(p.slug);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  {p.slug === value && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditDateModal({
  sub,
  onClose,
  onSave,
}: {
  sub: Subscription;
  onClose: () => void;
  onSave: (date: string | null) => void;
}) {
  const [date, setDate] = useState<string>(sub.expiry_date ?? "");
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Edit expiry date</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {sub.customer_name} · {sub.product_name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => onSave(null)}
            className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
          <button
            onClick={() => onSave(date || null)}
            className="h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
