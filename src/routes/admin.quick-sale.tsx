import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";
import {
  Zap, User, Phone, Mail, Search, Plus, Minus, Trash2, Package,
  CreditCard, MessageCircle, Send, Save, Sparkles, ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/admin/quick-sale")({
  component: QuickSalePage,
});

type Plan = { label?: string; duration?: string; price?: number; original_price?: number };
type Product = { slug: string; name: string; emoji: string | null; plans: Plan[] };

type Item = {
  uid: string;
  product?: Product;
  planIdx: number;
  qty: number;
  basePrice: number;
  discountAmt: number;
  discountPct: number;
};

const PAYMENT_METHODS = [
  { v: "bkash", en: "Bkash", bn: "বিকাশ" },
  { v: "nagad", en: "Nagad", bn: "নগদ" },
  { v: "rocket", en: "Rocket", bn: "রকেট" },
  { v: "upay", en: "Upay", bn: "উপায়" },
  { v: "bank", en: "Bank", bn: "ব্যাংক" },
  { v: "cash", en: "Cash", bn: "ক্যাশ" },
];

const newItem = (): Item => ({
  uid: Math.random().toString(36).slice(2, 9),
  planIdx: 0,
  qty: 1,
  basePrice: 0,
  discountAmt: 0,
  discountPct: 0,
});

function QuickSalePage() {
  const { t, lang } = useAdminLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<Item[]>([newItem()]);

  const [payMethod, setPayMethod] = useState("bkash");
  const [payStatus, setPayStatus] = useState<"paid" | "pending" | "unpaid">("paid");
  const [trxId, setTrxId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"whatsapp" | "both" | "system">("whatsapp");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("slug,name,emoji,plans")
        .eq("is_active", true)
        .order("name");
      setProducts((data || []) as unknown as Product[]);
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
      setTotalOrders(count || 0);
    })();
  }, []);

  const updateItem = (uid: string, patch: Partial<Item>) =>
    setItems((cur) => cur.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));

  const itemFinal = (i: Item) => {
    const gross = i.basePrice * i.qty;
    const pctDisc = (gross * i.discountPct) / 100;
    return Math.max(0, gross - i.discountAmt - pctDisc);
  };

  const grandTotal = useMemo(() => items.reduce((a, i) => a + itemFinal(i), 0), [items]);

  const reset = () => {
    setName(""); setPhone(""); setEmail("");
    setItems([newItem()]);
    setTrxId(""); setNote("");
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error(t("Name and phone are required", "নাম ও ফোন প্রয়োজন"));
      return;
    }
    const valid = items.filter((i) => i.product);
    if (valid.length === 0) {
      toast.error(t("Add at least one product", "অন্তত একটি প্রোডাক্ট যোগ করুন"));
      return;
    }
    setBusy(true);
    try {
      const orderItems = valid.map((i) => {
        const plan = i.product!.plans?.[i.planIdx] || {};
        return {
          slug: i.product!.slug,
          name: i.product!.name,
          emoji: i.product!.emoji || "📦",
          planPeriod: plan.label || plan.duration || "",
          qty: i.qty,
          price: itemFinal(i) / Math.max(1, i.qty),
        };
      });

      if (deliveryMode !== "whatsapp") {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("orders")
          .insert({
            user_id: user?.id || null,
            full_name: name,
            email: email || `${phone}@manual.local`,
            phone,
            payment_method: payMethod,
            transaction_id: trxId || `QS-${Date.now()}`,
            items: orderItems,
            total: grandTotal,
            status: payStatus === "paid" ? "processing" : "pending",
            payment_status: payStatus === "paid" ? "verified" : "pending",
            admin_note: note || null,
          } as never)
          .select("id")
          .single();
        if (error) throw error;
        setTotalOrders((c) => c + 1);
        toast.success(t("Order created", "অর্ডার তৈরি হয়েছে"));
      }

      if (deliveryMode !== "system") {
        const num = phone.replace(/\D/g, "");
        const lines = [
          `Hello ${name},`,
          ``,
          t("Your order summary:", "আপনার অর্ডার সারসংক্ষেপ:"),
          ...orderItems.map((it) => `• ${it.name} × ${it.qty} = ৳${(it.price * it.qty).toFixed(0)}`),
          ``,
          `${t("Total", "মোট")}: ৳${grandTotal.toFixed(0)}`,
          `${t("Payment", "পেমেন্ট")}: ${payMethod.toUpperCase()} (${payStatus})`,
          trxId ? `TrxID: ${trxId}` : "",
          note ? `\n${note}` : "",
        ].filter(Boolean);
        const url = `https://wa.me/${num}?text=${encodeURIComponent(lines.join("\n"))}`;
        window.open(url, "_blank");
      }

      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const totalItems = items.filter((i) => i.product).reduce((a, i) => a + i.qty, 0);

  return (
    <div className="space-y-6">
        {/* Stats pill */}
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
            <ShoppingCart className="w-3.5 h-3.5" /> {t("Total Orders", "মোট অর্ডার")}: {totalOrders}
          </span>
        </div>

        {/* Step 1: Customer */}
        <Section step={1} title={t("Customer Info", "কাস্টমার তথ্য")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label={t("Name", "নাম")} required>
              <IconInput icon={<User className="w-4 h-4" />} value={name} onChange={setName} placeholder={t("Customer name", "কাস্টমারের নাম")} />
            </Field>
            <Field label={t("Phone", "ফোন")} required>
              <IconInput icon={<Phone className="w-4 h-4" />} value={phone} onChange={setPhone} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label={t("Email", "ইমেইল")}>
              <IconInput icon={<Mail className="w-4 h-4" />} value={email} onChange={setEmail} placeholder="email@example.com" />
            </Field>
          </div>
        </Section>

        {/* Step 2: Products */}
        <Section
          step={2}
          title={t("Products & Licenses", "প্রোডাক্ট ও লাইসেন্স")}
          right={
            <button
              onClick={() => setItems((c) => [...c, newItem()])}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-sm hover:opacity-95"
            >
              <Plus className="w-3.5 h-3.5" /> {t("Add Item", "আইটেম যোগ")}
            </button>
          }
        >
          <div className="space-y-3">
            {items.map((it, idx) => (
              <ItemCard
                key={it.uid}
                index={idx + 1}
                item={it}
                products={products}
                onChange={(patch) => updateItem(it.uid, patch)}
                onRemove={() => setItems((c) => c.length > 1 ? c.filter((x) => x.uid !== it.uid) : c)}
                canRemove={items.length > 1}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        </Section>

        {/* Step 3: Payment & Delivery */}
        <Section step={3} title={t("Payment & Delivery", "পেমেন্ট ও ডেলিভারি")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CreditCard className="w-4 h-4 text-violet-600" /> {t("Payment", "পেমেন্ট")}
              </div>
              <Field label={t("Method", "মেথড")}>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900">
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.v} value={p.v}>{t(p.en, p.bn)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Status", "স্ট্যাটাস")}>
                <select value={payStatus} onChange={(e) => setPayStatus(e.target.value as never)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900">
                  <option value="paid">{t("Paid ✅", "পেইড ✅")}</option>
                  <option value="pending">{t("Pending ⏳", "পেন্ডিং ⏳")}</option>
                  <option value="unpaid">{t("Unpaid ❌", "আনপেইড ❌")}</option>
                </select>
              </Field>
              <Field label={t("Transaction ID", "ট্রানজেকশন আইডি")}>
                <input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="TrxID (optional)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900" />
              </Field>
            </div>

            {/* Delivery box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Send className="w-4 h-4 text-violet-600" /> {t("Delivery Method", "ডেলিভারি মেথড")}
              </div>
              <DeliveryOption
                active={deliveryMode === "whatsapp"}
                onClick={() => setDeliveryMode("whatsapp")}
                icon={<MessageCircle className="w-4 h-4" />}
                title={t("Send to WhatsApp", "WhatsApp এ পাঠান")}
                desc={t("Direct WhatsApp message", "সরাসরি WhatsApp মেসেজ")}
              />
              <DeliveryOption
                active={deliveryMode === "both"}
                onClick={() => setDeliveryMode("both")}
                icon={<Send className="w-4 h-4" />}
                title={t("WhatsApp + System", "WhatsApp + সিস্টেম")}
                desc={t("WhatsApp & save to database", "WhatsApp ও ডাটাবেজে সেভ")}
              />
              <DeliveryOption
                active={deliveryMode === "system"}
                onClick={() => setDeliveryMode("system")}
                icon={<Save className="w-4 h-4" />}
                title={t("Only system save", "শুধু সিস্টেমে সেভ")}
                desc={t("Save record only", "শুধু ডাটাবেজে রেকর্ড")}
              />
              <Field label={t("Note", "নোট")}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Additional note (optional)", "অতিরিক্ত নোট (ঐচ্ছিক)")}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900" />
              </Field>
            </div>
          </div>
        </Section>

      {/* Inline action footer */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 text-sm">
          <Package className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">{t("Items", "আইটেম")}: <b className="text-slate-900">{totalItems}</b></span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">{t("Delivery", "ডেলিভারি")}: <b className="text-slate-900 capitalize">{deliveryMode}</b></span>
          <span className="ml-3 text-lg font-bold text-violet-700">৳{grandTotal.toFixed(0)}</span>
        </div>
        <button
          disabled={busy}
          onClick={submit}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-md hover:opacity-95 disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" /> {busy ? t("Processing…", "প্রসেসিং…") : t("Create & Deliver", "অর্ডার তৈরি ও ডেলিভারি")}
        </button>
      </div>
    </div>
  );
}

function Section({ step, title, right, children }: { step: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold grid place-items-center">{step}</span>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 mb-1.5 block">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function IconInput({ icon, value, onChange, placeholder }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

function ItemCard({
  index, item, products, onChange, onRemove, canRemove, lang, t,
}: {
  index: number;
  item: Item;
  products: Product[];
  onChange: (p: Partial<Item>) => void;
  onRemove: () => void;
  canRemove: boolean;
  lang: string;
  t: (en: string, bn: string) => string;
}) {
  const [q, setQ] = useState(item.product?.name || "");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 8);
    return products.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, products]);

  const choose = (p: Product) => {
    const plan = (p.plans && p.plans[0]) || {};
    onChange({ product: p, planIdx: 0, basePrice: Number(plan.price || 0) });
    setQ(p.name);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Package className="w-3.5 h-3.5 text-violet-600" /> {t("Item", "আইটেম")} #{index}
        </div>
        {canRemove && (
          <button onClick={onRemove} className="text-slate-400 hover:text-rose-600">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
        <Field label={t("Product", "প্রোডাক্ট")} required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={t("Search product by name…", "প্রোডাক্ট নাম লিখে সার্চ করুন…")}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm"
            />
            {open && matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {matches.map((p) => (
                  <button
                    key={p.slug}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(p)}
                    className="w-full text-left px-3 py-2 hover:bg-violet-50 flex items-center gap-2 text-sm"
                  >
                    <span>{p.emoji || "📦"}</span>
                    <span className="flex-1 truncate text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-500">৳{p.plans?.[0]?.price ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <Field label={t("Quantity", "পরিমাণ")}>
          <div className="flex items-center h-10 rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button onClick={() => onChange({ qty: Math.max(1, item.qty - 1) })} className="px-3 h-full text-slate-500 hover:bg-slate-50"><Minus className="w-3.5 h-3.5" /></button>
            <input type="number" min={1} value={item.qty} onChange={(e) => onChange({ qty: Math.max(1, Number(e.target.value) || 1) })} className="flex-1 h-full text-center text-sm outline-none" />
            <button onClick={() => onChange({ qty: item.qty + 1 })} className="px-3 h-full text-slate-500 hover:bg-slate-50"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        </Field>
      </div>

      {item.product && item.product.plans?.length > 1 && (
        <Field label={t("Plan", "প্ল্যান")}>
          <select
            value={item.planIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const plan = item.product!.plans[idx] || {};
              onChange({ planIdx: idx, basePrice: Number(plan.price || 0) });
            }}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
          >
            {item.product.plans.map((p, i) => (
              <option key={i} value={i}>{p.label || p.duration} — ৳{p.price}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label={t("Base Price (৳)", "মূল মূল্য (৳)")}>
          <input type="number" value={item.basePrice} onChange={(e) => onChange({ basePrice: Number(e.target.value) || 0 })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
        </Field>
        <Field label={t("Discount (৳)", "ডিসকাউন্ট (৳)")}>
          <input type="number" value={item.discountAmt} onChange={(e) => onChange({ discountAmt: Number(e.target.value) || 0 })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
        </Field>
        <Field label={t("Discount (%)", "ডিসকাউন্ট (%)")}>
          <input type="number" value={item.discountPct} onChange={(e) => onChange({ discountPct: Number(e.target.value) || 0 })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" />
        </Field>
        <Field label={t("Final Price (৳)", "ফাইনাল মূল্য (৳)")}>
          <div className="h-10 px-3 rounded-lg border border-violet-200 bg-violet-50 text-sm font-bold text-violet-800 grid place-items-start content-center">
            ৳{(item.basePrice * item.qty - item.discountAmt - (item.basePrice * item.qty * item.discountPct) / 100).toFixed(0)}
          </div>
        </Field>
      </div>
    </div>
  );
}

function DeliveryOption({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition ${
        active
          ? "border-violet-400 bg-[#f3eeff] ring-2 ring-[#ede4ff]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${active ? "bg-[#6d28d9] text-white" : "bg-slate-100 text-slate-600"}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${active ? "text-[#4c1d95]" : "text-slate-800"}`}>{title}</span>
        <span className={`block text-xs ${active ? "text-[#6d28d9]" : "text-slate-500"}`}>{desc}</span>
      </span>
      <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${active ? "border-[#6d28d9] bg-[#6d28d9]" : "border-slate-300"}`} />
    </button>
  );
}
