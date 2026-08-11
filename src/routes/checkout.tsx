import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, X, ChevronRight, ShieldCheck, Lock, ArrowLeft, User, Mail, Phone, ShoppingBag, Tag, Smartphone, Copy } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { captureAbandonedCheckout } from "@/lib/abandoned-checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAppliedCoupon, redeemCoupon } from "@/lib/coupons";
import { usePaymentMethods, useEpsPgwEnabled, useSslczPgwEnabled } from "@/hooks/useShopConfig";
import { createEpsPayment } from "@/lib/eps.functions";
import { createSslczPayment } from "@/lib/sslcommerz.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { createOrder } from "@/lib/orders.functions";
import { trackPurchase } from "@/lib/trackEvent";
import { notifyTelegram } from "@/lib/telegram";
import { PillField } from "@/components/checkout/PillField";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentMethods } from "@/components/checkout/PaymentMethods";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { PaymentInstructions } from "@/components/checkout/PaymentInstructions";



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
  validateSearch: (search: Record<string, unknown>): { step?: 1 | 2; coupon?: string } => ({
    step: search.step === "2" || search.step === 2 ? 2 : 1,
    coupon: typeof search.coupon === "string" ? search.coupon : "",
  }),
  head: () => ({ meta: [{ title: "Checkout — Rama Sub" }] }),
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
  { id: "bkash", name: "bKash", number: "01319029214", color: "bg-[#E2136E]", brand_color: "#E2136E", send_money_label: "Send Money" },
  { id: "nagad", name: "Nagad", number: "01319029214", color: "bg-[#EC1C24]", brand_color: "#EC1C24", send_money_label: "Send Money" },
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
  const { format, code: currencyCode } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const captureCheckout = useServerFn(captureAbandonedCheckout);

  const { step, coupon } = Route.useSearch();
  const setStep = (n: 1 | 2) =>
    navigate({ to: "/checkout", search: { step: n, coupon }, replace: false });

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
  const { data: epsEnabled } = useEpsPgwEnabled();
  const { data: sslczEnabled } = useSslczPgwEnabled();
  const isEpsMethod = method === "eps";
  const isSslczMethod = method === "sslcommerz";
  const isGatewayMethod = isEpsMethod || isSslczMethod;
  const createEps = useServerFn(createEpsPayment);
  const createSslcz = useServerFn(createSslczPayment);
  const submitOrder = useServerFn(createOrder);
  const [copied, setCopied] = useState(false);
  const [couponInput, setCouponInput] = useState(coupon || "");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!items.length) return;
    const slugs = items.map((i) => i.slug).filter(Boolean);
    if (!slugs.length) return;
    supabase.from("products").select("slug,image_url").in("slug", slugs)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((p: { slug: string; image_url: string | null }) => {
          if (p.image_url) map[p.slug] = p.image_url;
        });
        setProductImages(map);
      });
  }, [items]);


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
      navigate({ to: "/checkout", search: { step: 1, coupon }, replace: true });
    }
  }, [step, step1Valid, navigate, coupon]);

  const applied = useAppliedCoupon(coupon, total);

  // Capture abandoned checkout for BOTH signed-in and guest shoppers as soon as
  // ANY meaningful contact/payment field is filled. Admins can then follow up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!items?.length) return;
    const hasEmail = emailRe.test(form.email.trim());
    const hasPhone = isValidBdPhone(form.phone);
    const hasName = form.name.trim().length >= 2;
    // Need at least contact info before saving to admin recovery list.
    if (!hasEmail || !hasPhone) return;

    let sessionId: string | null = null;
    try {
      sessionId = window.sessionStorage.getItem("checkout_session_id");
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2, 10).toUpperCase();
        window.sessionStorage.setItem("checkout_session_id", sessionId);
      }
    } catch { /* ignore */ }

    const handle = window.setTimeout(() => {
      void captureCheckout({
        data: {
          email: form.email.trim().toLowerCase(),
          full_name: form.name.trim() || null,
          phone: hasPhone ? normalizeBdPhone(form.phone) : (form.phone.trim() || null),
          sender_number: form.senderNumber ? normalizeBdPhone(form.senderNumber) : null,
          transaction_id: form.trxId.trim() || null,
          payment_method: method || null,
          payment_screenshot_url: screenshotUrl || null,
          customer_note: form.notes.trim() || null,
          checkout_step: step,
          items: items.map((it) => ({
            slug: it.slug, name: it.name, planPeriod: it.planPeriod,
            qty: it.qty, price: it.price, emoji: it.emoji,
          })),
          subtotal: total,
          total: Math.max(0, total),
          coupon_code: coupon || null,
        },
      }).catch((err) => {
        if (typeof console !== "undefined") console.warn("abandoned capture", err?.message ?? err);
      });
    }, 900);
    return () => window.clearTimeout(handle);
  }, [captureCheckout, form.name, form.phone, form.senderNumber, form.trxId, form.notes, items, method, screenshotUrl, step, total, coupon, user?.id]);


  const subAfterCoupon = Math.max(0, total - applied.discount);
  const isWalletMethod = method === "wallet";
  const walletApplied = isWalletMethod ? Math.min(walletBalance, subAfterCoupon) : (useWallet ? Math.min(walletBalance, subAfterCoupon) : 0);
  const grandTotal = Math.max(0, subAfterCoupon - walletApplied);
  const fullyByWallet = isWalletMethod ? walletBalance >= subAfterCoupon : (walletApplied > 0 && grandTotal === 0);
  const walletInsufficient = isWalletMethod && walletBalance < subAfterCoupon;


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
      const created = await submitOrder({
        data: {
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          payment_method: fullyByWallet ? "wallet" : method,
          transaction_id: fullyByWallet ? `WALLET-${Date.now()}` : form.trxId,
          payment_screenshot_url: screenshotUrl || null,
          items: items.map((it) => ({
            slug: it.slug,
            planPeriod: it.planPeriod,
            qty: it.qty,
          })),
          coupon_code: applied.valid && applied.code ? applied.code : null,
        },
      });
      const newId = created.id;
      // Server is the source of truth for pricing now.
      const serverTotal = created.total;
      const serverWalletApplied = Math.min(walletApplied, serverTotal);
      if (serverWalletApplied > 0) {
        const { error: wErr } = await supabase.rpc("spend_wallet" as any, {
          _amount: serverWalletApplied,
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
          items: created.items.map((it) => ({ name: it.name || it.slug, qty: it.qty, price: it.price * it.qty })),
          subtotal: created.subtotal,
          discount: created.discount,
          total: serverTotal,
          paymentMethod: fullyByWallet ? "wallet" : method,
          estimatedDelivery: "১৫–৩০ মিনিট",
        },
      }).catch((err) => console.warn("Order confirmation email failed", err));
      try {
        trackPurchase({
          value: serverTotal,
          currency: "BDT",
          orderId: `ANB-${newId.slice(0, 8).toUpperCase()}`,
          // Email + phone give Meta a real match key (better Event Match Quality).
          email: form.email,
          phone: form.phone,
          eventId: `purchase_ANB-${newId.slice(0, 8).toUpperCase()}`,

          items: created.items.map((it) => ({
            id: it.slug,
            name: it.name || it.slug,
            price: it.price,
            quantity: it.qty,
          })),
        });
      } catch {
        /* ignore */
      }
      notifyTelegram({
        event: "order_created",
        title: "নতুন অর্ডার এসেছে!",
        lines: [
          ["Order ID", `ANB-${newId.slice(0, 8).toUpperCase()}`],
          ["Customer", form.name],
          ["Phone", form.phone],
          ["Email", form.email],
          ["Items", created.items.map((it) => `${it.name || it.slug} × ${it.qty}`).join(", ")],
          ["Payment", fullyByWallet ? "Wallet" : method],
          ["Total", `৳${serverTotal}`],
        ],
        url: `https://ramasub.com/orders/${newId}`,
      });
      clear();
      if (isEpsMethod && !fullyByWallet) {
        try {
          const eps = await createEps({ data: { orderId: newId } });
          if (eps?.redirectURL) {
            window.location.href = eps.redirectURL;
            return;
          }
          setErr("EPS gateway URL পাওয়া যায়নি। Admin panel-এ credentials verify করুন।");
        } catch (e) {
          setErr(e instanceof Error ? e.message : "EPS payment failed to start");
        }
      }
      if (isSslczMethod && !fullyByWallet) {
        try {
          const s = await createSslcz({ data: { orderId: newId } });
          if (s?.redirectURL) {
            window.location.href = s.redirectURL;
            return;
          }
          setErr("SSLCommerz gateway URL পাওয়া যায়নি। Admin panel-এ credentials verify করুন।");
        } catch (e) {
          setErr(e instanceof Error ? e.message : "SSLCommerz payment failed to start");
        }
      }
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

  const applyCouponNow = useCallback(() => {
    const code = couponInput.trim().toUpperCase();
    navigate({ to: "/checkout", search: { step: 1, coupon: code }, replace: true });
  }, [couponInput, navigate]);

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 py-12 md:py-20">
        {/* Simple Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2 cursor-pointer hover:opacity-80 transition" onClick={() => navigate({ to: "/cart" })}>
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Back to Cart</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Checkout
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-card/40 backdrop-blur-sm border border-border/40 px-6 py-3 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure 256-bit SSL Encryption</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,400px] gap-12 items-start">
          {/* Left Column: Forms */}
          <div className="space-y-12">
            <CheckoutProgress 
              currentStep={step || 1} 
              onStepClick={setStep} 
              isStep1Valid={step1Valid} 
            />

            {step === 1 ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Contact Information
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <PillField 
                    label="Full Name" 
                    icon={User}
                    value={form.name} 
                    onChange={(v) => update("name", v)} 
                    onBlur={() => blur("name")} 
                    error={touched.name ? errors.name : null} 
                    placeholder="Enter your name" 
                  />
                  <PillField 
                    label="Email Address" 
                    type="email" 
                    icon={Mail}
                    value={form.email} 
                    onChange={(v) => update("email", v)} 
                    onBlur={() => blur("email")} 
                    error={touched.email ? errors.email : null} 
                    placeholder="you@example.com" 
                  />
                </div>
                
                <div className="max-w-md">
                  <PillField 
                    label="Phone Number" 
                    icon={Phone}
                    value={form.phone} 
                    onChange={(v) => update("phone", v)} 
                    onBlur={() => blur("phone")} 
                    error={touched.phone ? errors.phone : null} 
                    placeholder="01XXXXXXXXX" 
                    inputMode="tel" 
                  />
                </div>

                <div className="pt-6">
                  <button
                    onClick={goNext}
                    disabled={!step1Valid}
                    className="group relative h-14 w-full md:w-auto md:px-12 rounded-[2rem] bg-foreground text-background text-sm font-black uppercase tracking-widest overflow-hidden transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-foreground/10"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Continue to Payment
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <PaymentMethods 
                  methods={methods}
                  selectedMethod={method}
                  onSelect={setMethod}
                  walletBalance={walletBalance}
                  useWallet={useWallet}
                  onWalletToggle={setUseWallet}
                  epsEnabled={!!epsEnabled}
                  sslczEnabled={!!sslczEnabled}
                  subAfterCoupon={subAfterCoupon}
                />

                {!isGatewayMethod && !isWalletMethod && (
                  <PaymentInstructions 
                    methodName={selectedMethod.name}
                    methodNumber={selectedMethod.number}
                    brandColor={brand}
                    sendMoneyLabel={sendLabel}
                    instructions={steps2}
                    trxId={form.trxId}
                    senderNumber={form.senderNumber}
                    onTrxIdChange={(v) => update("trxId", v)}
                    onSenderNumberChange={(v) => update("senderNumber", v)}
                    onTrxIdBlur={() => blur("trxId")}
                    onSenderNumberBlur={() => blur("senderNumber")}
                    trxIdError={touched.trxId ? errors.trxId : null}
                    senderNumberError={touched.senderNumber ? errors.senderNumber : null}
                    screenshotUrl={screenshotUrl}
                    uploading={uploading}
                    onScreenshotUpload={handleScreenshot}
                    onScreenshotRemove={() => setScreenshotUrl("")}
                  />
                )}

                {/* Final Error Display */}
                {err && (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold animate-in shake duration-500">
                    {err}
                  </div>
                )}

                <div className="pt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={busy || (isWalletMethod && walletInsufficient) || (!isGatewayMethod && !isWalletMethod && (!form.trxId || !form.senderNumber))}
                    className="group relative h-16 w-full rounded-[2.5rem] text-background text-base font-black uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-primary/20"
                    style={{ background: CTA_GRADIENT }}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {busy ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Complete Order • {format(grandTotal)}
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-[0.1em] mt-4">
                    By completing your order, you agree to our <span className="text-primary underline cursor-pointer">Terms of Service</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary (Sticky) */}
          <div className="lg:block">
            <OrderSummary 
              appliedDiscount={applied.discount}
              couponCode={coupon || null}
              couponLabel={applied.label || null}
              isCouponValid={applied.valid}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              onApplyCoupon={applyCouponNow}
              grandTotal={grandTotal}
              productImages={productImages}
            />
          </div>
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

