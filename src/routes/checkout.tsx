import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Lock, Smartphone, Loader2, X, ChevronRight, Tag, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { supabase } from "@/integrations/supabase/client";
import { useAppliedCoupon, redeemCoupon } from "@/lib/coupons";
import { usePaymentMethods } from "@/hooks/useShopConfig";
import { sendTransactionalEmail } from "@/lib/email/send";
import { trackPurchase } from "@/lib/trackEvent";


function CheckoutErrorComponent({ error }: { error: Error }) {
  if (typeof window !== "undefined") console.error("Checkout render error:", error);
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-background text-foreground">
      <div className="max-w-[480px] w-full rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xl">
        <h1 className="text-xl font-bold mb-2">চেকআউট লোড করা যায়নি</h1>
        <p className="text-sm text-muted-foreground mb-4">{error?.message || "Unknown error"}</p>
        <button
          onClick={() => window.location.reload()}
          className="h-11 px-5 rounded-full text-primary-foreground font-semibold"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)" }}
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  errorComponent: CheckoutErrorComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    step: search.step === "2" || search.step === 2 ? 2 : 1,
    coupon: typeof search.coupon === "string" ? search.coupon : "",
  }),
  head: () => ({ meta: [{ title: "Checkout — AccessNow BD" }] }),
});

type PayMethod = {
  id: string;
  name: string;
  number: string;
  color: string;
  instructions?: string;
  logo_url?: string;
  brand_color?: string;
  send_money_label?: string;
};

const FALLBACK_METHODS: PayMethod[] = [
  { id: "bkash", name: "bKash", number: "01711-123456", color: "bg-[#E2136E]", brand_color: "#E2136E", send_money_label: "Send Money" },
  { id: "nagad", name: "Nagad", number: "01911-654321", color: "bg-[#EC1C24]", brand_color: "#EC1C24", send_money_label: "Send Money" },
  { id: "rocket", name: "Rocket", number: "01511-987654", color: "bg-[#8C3494]", brand_color: "#8C3494", send_money_label: "Send Money" },
];

const COLOR_BY_NAME: Record<string, string> = {
  bkash: "bg-[#E2136E]",
  nagad: "bg-[#EC1C24]",
  rocket: "bg-[#8C3494]",
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bdPhoneRe = /^01[3-9]\d{8}$/;
const normalizeBdPhone = (value: string) => {
  const compact = value.replace(/[\s-]/g, "");
  if (compact.startsWith("+880")) return `0${compact.slice(4)}`;
  if (compact.startsWith("880")) return `0${compact.slice(3)}`;
  return compact;
};
const isValidBdPhone = (value: string) => bdPhoneRe.test(normalizeBdPhone(value));

const CTA_GRADIENT = "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)";

function CheckoutPage() {
  const { items, total, clear, ready: cartReady } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { step, coupon } = Route.useSearch();
  const setStep = (n: 1 | 2) =>
    navigate({ to: "/checkout", search: { step: String(n), coupon }, replace: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", senderNumber: "", trxId: "", notes: "" });
  const { data: dynamicMethods } = usePaymentMethods("checkout");
  const methods: PayMethod[] = useMemo(() => {
    const list = (dynamicMethods ?? []).map((m) => ({
      id: (m.id || m.name || "").toLowerCase().replace(/\s+/g, "-") || m.name,
      name: m.name,
      number: m.number,
      color: m.color || COLOR_BY_NAME[m.name?.toLowerCase()] || "bg-slate-700",
      instructions: m.instructions,
      logo_url: m.logo_url,
      brand_color: m.brand_color,
      send_money_label: m.send_money_label,
    }));
    return list.length > 0 ? list : FALLBACK_METHODS;
  }, [dynamicMethods]);
  const [method, setMethod] = useState<string>("bkash");
  const [copied, setCopied] = useState(false);
  const [couponInput, setCouponInput] = useState(coupon || "");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, email: f.email || user.email || "" }));
    supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          name: f.name || data.display_name || "",
          phone: f.phone || data.phone || "",
        }));
      });
  }, [user]);

  useEffect(() => {
    if (!user) { setWalletBalance(0); return; }
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setWalletBalance(Number(data?.balance ?? 0)));
  }, [user]);

  useEffect(() => {
    if (methods.length && !methods.find((m) => m.id === method)) {
      setMethod(methods[0].id);
    }
  }, [methods, method]);

  const selectedMethod = methods.find((m) => m.id === method) ?? methods[0];
  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "নাম দিন";
    if (!emailRe.test(form.email)) e.email = "সঠিক ইমেইল দিন";
    if (!isValidBdPhone(form.phone)) e.phone = "সঠিক BD নম্বর দিন";
    if (!isValidBdPhone(form.senderNumber)) e.senderNumber = "যেই নম্বর থেকে পাঠিয়েছেন";
    if (form.trxId.trim().length < 6) e.trxId = "TrxID খুব ছোট";
    return e;
  }, [form]);

  const step1Valid = !errors.name && !errors.email && !errors.phone;

  useEffect(() => {
    if (step === 2 && !step1Valid) {
      setTouched((t) => ({ ...t, name: true, email: true, phone: true }));
      navigate({ to: "/checkout", search: { step: "1", coupon }, replace: true });
    }
  }, [step, step1Valid, navigate, coupon]);

  const applied = useAppliedCoupon(coupon, total);

  // Capture abandoned checkout: debounced upsert as soon as we have valid contact info + items.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) return; // only capture for signed-in shoppers (RLS scopes rows to user_id)
    if (!items?.length) return;
    if (!form.name.trim() || !emailRe.test(form.email) || !isValidBdPhone(form.phone)) return;
    const handle = window.setTimeout(() => {
      const payload = {
        user_id: user.id,
        full_name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizeBdPhone(form.phone),
        items: items.map((it) => ({
          slug: it.slug, name: it.name, planPeriod: it.planPeriod,
          qty: it.qty, price: it.price, emoji: it.emoji,
        })),
        subtotal: total,
        total: Math.max(0, total),
        coupon_code: coupon || null,
        status: "pending",
      };
      (supabase.from("abandoned_checkouts" as never) as unknown as { upsert: (p: unknown, o: { onConflict: string }) => Promise<{ error: { message: string } | null }> })
        .upsert(payload, { onConflict: "user_id" })
        .then(({ error }) => {
          if (error && typeof console !== "undefined") console.warn("abandoned capture", error.message);
        });

    }, 1500);
    return () => window.clearTimeout(handle);

  }, [form.name, form.email, form.phone, items, total, coupon, user?.id]);

  const subAfterCoupon = Math.max(0, total - applied.discount);
  const walletApplied = useWallet ? Math.min(walletBalance, subAfterCoupon) : 0;
  const grandTotal = Math.max(0, subAfterCoupon - walletApplied);
  const fullyByWallet = walletApplied > 0 && grandTotal === 0;

  const copyNumber = async () => {
    await navigator.clipboard.writeText(selectedMethod.number.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async () => {
    if (!user) {
      rememberReturnTo();
      navigate({ to: "/login" });
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          payment_method: fullyByWallet ? "wallet" : method,
          transaction_id: fullyByWallet ? `WALLET-${Date.now()}` : form.trxId,
          payment_screenshot_url: screenshotUrl || null,
          items: items.map((it) => ({ slug: it.slug, planPeriod: it.planPeriod, qty: it.qty, name: it.name, emoji: it.emoji, gradient: it.gradient, price: it.price })),
          total: subAfterCoupon,
        })
        .select("id")
        .single();
      if (error) throw error;
      const newId = data.id as string;
      if (walletApplied > 0) {
        const { error: wErr } = await supabase.rpc("spend_wallet" as any, {
          _amount: walletApplied,
          _ref_order: newId,
          _reason: `Order ANB-${newId.slice(0, 8).toUpperCase()}`,
        });
        if (wErr) {
          setErr(`Wallet charge failed: ${wErr.message}. Order created without wallet payment.`);
        }
      }
      if (applied.valid && applied.code) {
        redeemCoupon(applied.code).catch(() => {});
      }
      sendTransactionalEmail({
        templateName: "order-confirmation",
        recipientEmail: form.email,
        idempotencyKey: `order-confirm-${newId}`,
        templateData: {
          name: form.name?.split(" ")[0],
          orderId: `ANB-${newId.slice(0, 8).toUpperCase()}`,
          items: items.map((it) => ({ name: it.name || it.slug, qty: it.qty, price: (it.price ?? 0) * it.qty })),
          subtotal: total,
          discount: applied.discount || 0,
          total: subAfterCoupon,
          paymentMethod: fullyByWallet ? "wallet" : method,
          estimatedDelivery: "১৫–৩০ মিনিট",
        },
      }).catch((err) => console.warn("Order confirmation email failed", err));
      try {
        trackPurchase({
          value: subAfterCoupon,
          currency: "BDT",
          orderId: `ANB-${newId.slice(0, 8).toUpperCase()}`,
          items: items.map((it) => ({
            id: it.slug,
            name: it.name,
            price: it.price,
            quantity: it.qty,
          })),
        });
      } catch {
        /* ignore */
      }
      clear();
      navigate({ to: "/orders/$id", params: { id: newId }, search: { new: 1 } });
      return;

    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  // ----- Guards (loading / login / empty cart) -----
  if (authLoading || !cartReady) {
    return (
      <GuardLayout>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Checkout loading…</p>
      </GuardLayout>
    );
  }

  if (!user && items.length > 0) {
    return (
      <GuardLayout>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Login to checkout
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Sign in or create an account to place your order and track it later.
        </p>
        <button
          onClick={() => { rememberReturnTo(); navigate({ to: "/login" }); }}
          className="mt-5 h-11 px-6 rounded-full text-primary-foreground text-sm font-bold inline-flex items-center justify-center hover:opacity-95 transition shadow-lg shadow-primary/25"
          style={{ background: CTA_GRADIENT }}
        >
          Login / Sign up
        </button>
      </GuardLayout>
    );
  }

  if (items.length === 0) {
    return (
      <GuardLayout>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Your cart is empty
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Add a subscription before checking out.</p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition"
        >
          Browse subscriptions
        </Link>
      </GuardLayout>
    );
  }

  const goNext = () => {
    if (step === 1) {
      setTouched({ name: true, email: true, phone: true });
      if (step1Valid) setStep(2);
    }
  };

  const firstItem = items[0];
  const headerTitle = items.length === 1 ? firstItem.name : `${items.length} items`;

  // ============ STEP 1: CONTACT ============
  if (step === 1) {
    const applyCouponNow = () => {
      const code = couponInput.trim().toUpperCase();
      navigate({ to: "/checkout", search: { step: "1", coupon: code }, replace: true });
    };
    return (
      <div className="checkout-page min-h-screen bg-background text-foreground grid place-items-center px-4 py-8 md:py-12">
        <div className="w-full max-w-[520px] rounded-[2rem] border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${firstItem.gradient} grid place-items-center text-lg`}>
                {firstItem.emoji}
              </div>
              <h1 className="text-[15px] font-semibold truncate" style={{ fontFamily: "var(--font-heading)" }}>
                {headerTitle}
              </h1>
            </div>
            <button
              onClick={() => navigate({ to: "/cart" })}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Step heading */}
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                ১
              </span>
              <h2 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                আপনার তথ্য দিন
              </h2>
            </div>
            {user && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                লগইন আছে <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Fields */}
          <div className="px-5 mt-4 space-y-3">
            <PillField label="পুরো নাম" value={form.name} onChange={(v) => update("name", v)} onBlur={() => blur("name")} error={touched.name ? errors.name : null} placeholder="আপনার নাম" />
            <PillField label="ইমেইল" type="email" value={form.email} onChange={(v) => update("email", v)} onBlur={() => blur("email")} error={touched.email ? errors.email : null} placeholder="you@email.com" />
            <PillField label="ফোন নম্বর" value={form.phone} onChange={(v) => update("phone", v)} onBlur={() => blur("phone")} error={touched.phone ? errors.phone : null} placeholder="01XXXXXXXXX" inputMode="numeric" />

            {/* Coupon */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground ml-3">কুপন কোড (ঐচ্ছিক)</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-full border border-border bg-background px-4 h-11 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={applyCouponNow}
                  className="h-11 px-5 rounded-full border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Apply
                </button>
              </div>
              {coupon && (
                <p className={`text-[11px] mt-1.5 ml-3 ${applied.valid ? "text-emerald-500" : "text-destructive"}`}>
                  {applied.valid ? `প্রয়োগ হয়েছে: ${applied.label}` : "কুপন কোডটি সঠিক নয়"}
                </p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="mx-5 mt-5 rounded-2xl border border-border bg-background overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">মূল্য</span>
              <span className="text-foreground font-medium tabular-nums">৳{total.toLocaleString()}</span>
            </div>
            {applied.discount > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-border">
                <span className="text-emerald-500">ছাড় ({applied.code})</span>
                <span className="text-emerald-500 font-medium tabular-nums">−৳{applied.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted">
              <span className="text-[15px] font-semibold">মোট</span>
              <span className="text-xl font-bold text-primary tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                ৳{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 py-5">
            <button
              onClick={goNext}
              disabled={!step1Valid}
              className="w-full h-12 rounded-full text-primary-foreground text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-lg shadow-primary/25"
              style={{ background: CTA_GRADIENT }}
            >
              পেমেন্টে যান <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 2: PAYMENT ============
  const brand = selectedMethod.brand_color || "#7c3aed";
  const sendLabel = selectedMethod.send_money_label || "Send Money";

  const instructionLines = (selectedMethod.instructions || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const steps2 = instructionLines.length > 0 ? instructionLines : [
    `আপনার ${selectedMethod.name} অ্যাপ বা *247# ডায়াল করুন`,
    `"${sendLabel}" অপশনটি সিলেক্ট করুন`,
    `নম্বর বক্সে উপরের নম্বরটি পেস্ট করুন`,
    `পরিমাণ লিখুন ও PIN দিয়ে কনফার্ম করুন`,
    `Transaction ID কপি করুন`,
    `নিচের বক্সে TrxID পেস্ট করে অর্ডার সম্পন্ন করুন`,
  ];

  const handleScreenshot = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { setErr("ফাইল সর্বোচ্চ ৫MB হতে হবে"); return; }
    setUploading(true);
    setErr(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      setScreenshotUrl(path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "আপলোড ব্যর্থ হয়েছে");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="checkout-page min-h-screen bg-background text-foreground grid place-items-center px-4 py-8 md:py-12">
      <div className="w-full max-w-[520px] rounded-[2rem] border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${firstItem.gradient} grid place-items-center text-lg`}>
              {firstItem.emoji}
            </div>
            <h1 className="text-[15px] font-semibold truncate" style={{ fontFamily: "var(--font-heading)" }}>
              {headerTitle}
            </h1>
          </div>
          <button onClick={() => navigate({ to: "/cart" })} aria-label="Close" className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border mx-5" />

        {/* Step heading */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">২</span>
            <h2 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-heading)" }}>পেমেন্ট করুন</h2>
          </div>
          <button onClick={() => setStep(1)} className="text-xs text-primary hover:opacity-80 inline-flex items-center gap-1 font-medium">
            ← পিছনে
          </button>
        </div>

        {/* Payment method tiles */}
        <div className="px-5 mt-4 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Payment method">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                role="radio"
                aria-checked={active}
                className={`relative rounded-2xl border-2 bg-background px-3 py-3 flex flex-col items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="w-12 h-12 grid place-items-center">
                  {m.logo_url ? (
                    <img src={m.logo_url} alt={m.name} className="max-w-full max-h-full object-contain" loading="lazy" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${m.color} grid place-items-center text-white text-[10px] font-bold`}>
                      {m.name.slice(0, 4)}
                    </div>
                  )}
                </div>
                <div className="text-[12px] font-semibold text-foreground text-center leading-tight">{m.name}</div>
              </button>
            );
          })}
        </div>

        {/* Wallet */}
        {walletBalance > 0 && (
          <div className="mx-5 mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="w-4 h-4 accent-primary" />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-foreground">💳 ওয়ালেট ব্যালেন্স ব্যবহার করুন</div>
                <div className="text-[11px] text-muted-foreground">Available: ৳{walletBalance.toLocaleString()}</div>
              </div>
              {useWallet && walletApplied > 0 && (
                <div className="text-[13px] font-bold text-primary tabular-nums">−৳{walletApplied.toLocaleString()}</div>
              )}
            </label>
            {fullyByWallet && (
              <p className="text-[11px] text-emerald-500 font-semibold mt-2">✓ Wallet দিয়ে সম্পূর্ণ পেমেন্ট হবে — bKash/Nagad লাগবে না</p>
            )}
          </div>
        )}

        {/* Brand instruction card */}
        {!fullyByWallet && (
          <div className="mx-5 mt-5 rounded-3xl border border-border bg-muted p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg grid place-items-center bg-background border border-border shrink-0">
                  {selectedMethod.logo_url ? (
                    <img src={selectedMethod.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Smartphone className="w-4 h-4" style={{ color: brand }} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{selectedMethod.name}</div>
                  <div className="text-[13px] font-bold text-foreground">{sendLabel} করুন</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">মোট পাঠাবেন</div>
                <div className="text-[16px] font-bold text-primary tabular-nums">৳{grandTotal.toLocaleString()}</div>
              </div>
            </div>

            {/* Number card */}
            <div className="bg-background rounded-2xl p-4 flex flex-col items-center border border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{sendLabel} নম্বর</span>
              <button
                onClick={copyNumber}
                className="text-[22px] sm:text-[24px] font-black text-foreground tracking-wider mb-3 tabular-nums hover:text-primary transition"
                style={{ fontFamily: "var(--font-heading)" }}
                title="ক্লিক করে কপি করুন"
              >
                {selectedMethod.number}
              </button>
              <button
                onClick={copyNumber}
                className="w-full h-11 rounded-xl text-primary-foreground font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-primary/20"
                style={{ background: CTA_GRADIENT }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "কপি হয়েছে" : "নম্বরটি কপি করুন"}
              </button>
              <p className="text-[10px] text-muted-foreground mt-2 italic">👆 নম্বরটি ক্লিক করলেই কপি হবে</p>
            </div>

            {/* Steps */}
            <div className="space-y-2 text-[12px] text-foreground/85 font-medium px-1">
              {steps2.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 bg-primary/15 text-primary rounded-full flex-shrink-0 grid place-items-center text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!fullyByWallet && (
          <>
            {/* Sender number */}
            <div className="px-5 mt-5">
              <label className="text-[12px] font-medium text-muted-foreground">
                যে নম্বর থেকে পাঠিয়েছেন <span className="text-destructive">*</span>
              </label>
              <div className={`mt-1 flex items-center rounded-full border bg-background px-4 h-11 transition ${
                touched.senderNumber && errors.senderNumber ? "border-destructive/60" : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
              }`}>
                <input
                  value={form.senderNumber}
                  onChange={(e) => update("senderNumber", e.target.value)}
                  onBlur={() => blur("senderNumber")}
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground tracking-wide"
                />
              </div>
              {touched.senderNumber && errors.senderNumber && (
                <p className="text-[11px] text-destructive mt-1 ml-3">{errors.senderNumber}</p>
              )}
            </div>

            {/* TrxID */}
            <div className="px-5 mt-4">
              <label className="text-[12px] font-medium text-muted-foreground">
                Transaction ID (TrxID) <span className="text-destructive">*</span>
              </label>
              <div className={`mt-1 flex items-center rounded-full border bg-background px-4 h-11 transition ${
                touched.trxId && errors.trxId ? "border-destructive/60" : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
              }`}>
                <input
                  value={form.trxId}
                  onChange={(e) => update("trxId", e.target.value.toUpperCase())}
                  onBlur={() => blur("trxId")}
                  placeholder="যেমন: 8F3K2P9X"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground tracking-wide"
                />
              </div>
              {touched.trxId && errors.trxId && (
                <p className="text-[11px] text-destructive mt-1 ml-3">{errors.trxId}</p>
              )}
            </div>

            {/* Screenshot */}
            <div className="px-5 mt-4">
              <div className="flex items-baseline justify-between">
                <label className="text-[13px] font-semibold text-foreground">📷 পেমেন্ট স্ক্রিনশট</label>
                <span className="text-[11px] text-muted-foreground">(ঐচ্ছিক)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">পেমেন্ট প্রমাণ হিসেবে স্ক্রিনশট দিলে দ্রুত ভেরিফাই হবে</p>
              <label className="mt-2 block rounded-2xl border-2 border-dashed border-border bg-muted py-5 px-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/80 transition">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleScreenshot(f);
                  }}
                />
                {uploading ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-foreground/80">
                    <Loader2 className="w-4 h-4 animate-spin" /> আপলোড হচ্ছে…
                  </span>
                ) : screenshotUrl ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-emerald-500 font-medium">
                    <Check className="w-4 h-4" /> স্ক্রিনশট আপলোড হয়েছে — পরিবর্তন করতে ক্লিক করুন
                  </span>
                ) : (
                  <>
                    <div className="text-[13px] font-semibold text-foreground">↑ স্ক্রিনশট সিলেক্ট করুন</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG • সর্বোচ্চ ৫MB</div>
                  </>
                )}
              </label>
            </div>
          </>
        )}

        {/* Total */}
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <span className="text-[14px] font-semibold text-foreground">পেমেন্ট মোট</span>
            <span className="text-[20px] font-bold text-primary tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
              ৳{grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {err && <p role="alert" className="px-5 mt-3 text-[12px] text-destructive text-center">{err}</p>}

        {/* CTA */}
        <div className="px-5 py-5">
          <button
            onClick={handleSubmit}
            disabled={busy || (!fullyByWallet && (!!errors.trxId || !form.trxId || !!errors.senderNumber || !form.senderNumber))}
            className="w-full h-12 rounded-full text-primary-foreground text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-lg shadow-primary/25"
            style={{ background: CTA_GRADIENT }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {busy ? "অর্ডার তৈরি হচ্ছে…" : `অর্ডার কনফার্ম করুন  ৳${grandTotal.toLocaleString()}`}
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-3 inline-flex items-center gap-1.5 justify-center w-full">
            <ShieldCheck className="w-3.5 h-3.5" /> নিরাপদ পেমেন্ট — আপনার তথ্য সুরক্ষিত
          </p>
        </div>
      </div>
    </div>
  );
}

function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center px-4 py-10">
      <div className="text-center w-full max-w-sm rounded-3xl border border-border bg-card text-card-foreground p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function PillField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text" | "email" | "tel";
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-muted-foreground ml-3">{label}</label>
      <div
        className={`mt-1 flex items-center rounded-full border bg-background px-4 h-11 transition ${
          error ? "border-destructive/60" : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
        }`}
      >
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-[11px] text-destructive mt-1 ml-3">{error}</p>}
    </div>
  );
}
