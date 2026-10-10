import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, X, Lock, ArrowLeft, User, Mail, Phone, ShoppingBag, CreditCard, ShieldCheck, Tag, Copy, Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
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

function CheckoutErrorComponent({ error }: { error: Error }) {
  if (typeof window !== "undefined") console.error("Checkout render error:", error);
  return (
    <div className="h-screen w-screen grid place-items-center px-4 py-10 bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-[480px] w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <X className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Checkout Error</h1>
        <p className="text-sm text-slate-400 mb-8">{error?.message || "An unexpected error occurred."}</p>
        <button
          onClick={() => window.location.reload()}
          className="h-12 px-8 rounded-full text-white font-bold tracking-wide hover:scale-105 transition-transform"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  errorComponent: CheckoutErrorComponent as never,
  validateSearch: (search: Record<string, unknown>): { coupon?: string } => ({
    coupon: typeof search.coupon === "string" ? search.coupon : "",
  }),
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

function CheckoutPage() {
  const { items, total, clear, ready: cartReady } = useCart();
  const { format } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const captureCheckout = useServerFn(captureAbandonedCheckout);

  const { coupon } = Route.useSearch();
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
  const isWalletMethod = method === "wallet";

  const createEps = useServerFn(createEpsPayment);
  const createSslcz = useServerFn(createSslczPayment);
  const submitOrder = useServerFn(createOrder);
  
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
    supabase.from("profiles").select("display_name, phone").eq("id", user.id).maybeSingle()
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
    if (!form.name.trim()) e.name = "Name required";
    if (!emailRe.test(form.email)) e.email = "Valid email required";
    if (!isValidBdPhone(form.phone)) e.phone = "Valid BD phone required";
    if (!isValidBdPhone(form.senderNumber)) e.senderNumber = "Sender number required";
    if (form.trxId.trim().length < 6) e.trxId = "TrxID too short";
    return e;
  }, [form]);

  const applied = useAppliedCoupon(coupon, total);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!items?.length) return;
    const hasEmail = emailRe.test(form.email.trim());
    const hasPhone = isValidBdPhone(form.phone);
    if (!hasEmail || !hasPhone) return;

    const handle = window.setTimeout(() => {
      void captureCheckout({
        data: {
          email: form.email.trim().toLowerCase(),
          full_name: form.name.trim() || "",
          phone: (hasPhone ? normalizeBdPhone(form.phone) : form.phone.trim()) || "",
          items: items.map((it) => ({
            slug: it.slug,
            name: it.name,
            price: it.price,
            quantity: it.qty,
            image_url: it.image_url ?? undefined,
            planLabel: it.planPeriod,
          })),
          status: "pending",
          total: Math.max(0, total),
          coupon_code: coupon || null,
          payment_method: fullyByWallet ? "wallet" : method,
          transaction_id: fullyByWallet ? `WALLET-${Date.now()}` : form.trxId,
          payment_screenshot_url: screenshotUrl || null,
        },
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(handle);
  }, [captureCheckout, form.name, form.phone, items, total, coupon, form.email]);

  const subAfterCoupon = Math.max(0, total - applied.discount);
  const walletApplied = isWalletMethod ? Math.min(walletBalance, subAfterCoupon) : (useWallet ? Math.min(walletBalance, subAfterCoupon) : 0);
  const grandTotal = Math.max(0, subAfterCoupon - walletApplied);
  const fullyByWallet = isWalletMethod ? walletBalance >= subAfterCoupon : (walletApplied > 0 && grandTotal === 0);
  const walletInsufficient = isWalletMethod && walletBalance < subAfterCoupon;

  const copyNumber = async () => {
    await navigator.clipboard.writeText(selectedMethod.number.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr("File max 5MB"); return; }
    setUploading(true); setErr(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const ufolder = user?.id || (form.phone ? form.phone.replace(/\D/g, "") : "guest");
      const path = `${ufolder}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      setScreenshotUrl(path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setErr(null); setBusy(true);
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
      const serverTotal = created.total;
      const serverWalletApplied = Math.min(walletApplied, serverTotal);
      
      if (serverWalletApplied > 0) {
        await supabase.rpc("spend_wallet" as any, {
          _amount: serverWalletApplied,
          _ref_order: newId,
          _reason: `Order ANB-${newId.slice(0, 8).toUpperCase()}`,
        });
      }
      if (applied.valid && applied.code) redeemCoupon(applied.code).catch(() => {});
      
      sendTransactionalEmail({
        templateName: "order-confirmation",
        recipientEmail: form.email,
        idempotencyKey: `order-confirm-${newId}`,
        templateData: {
          name: form.name?.split(" ")[0],
          orderId: `ANB-${newId.slice(0, 8).toUpperCase()}`,
          items: created.items.map((it: any) => ({ name: it.name || it.slug, qty: it.qty, price: it.price * it.qty })),
          subtotal: created.subtotal,
          discount: created.discount,
          total: serverTotal,
          paymentMethod: fullyByWallet ? "wallet" : method,
          estimatedDelivery: "15-30 Mins",
        },
      }).catch(() => {});

      try {
        trackPurchase({
          value: serverTotal, currency: "BDT",
          orderId: `ANB-${newId.slice(0, 8).toUpperCase()}`,
          email: form.email, phone: form.phone,
          eventId: `purchase_ANB-${newId.slice(0, 8).toUpperCase()}`,
          items: created.items.map((it: any) => ({ id: it.slug, name: it.name || it.slug, price: it.price, quantity: it.qty })),
        });
      } catch {}

      notifyTelegram({
        event: "order_created", title: "New Order!",
        lines: [
          ["Order ID", `ANB-${newId.slice(0, 8).toUpperCase()}`],
          ["Customer", form.name], ["Phone", form.phone], ["Email", form.email],
          ["Payment", fullyByWallet ? "Wallet" : method], ["Total", `৳${serverTotal}`],
        ],
        url: `https://ramasub.com/orders/${newId}`,
      });
      
      clear();
      
      if (isEpsMethod && !fullyByWallet) {
        const eps = await createEps({ data: { orderId: newId } });
        if (eps?.redirectURL) { window.location.href = eps.redirectURL; return; }
        throw new Error("EPS Gateway URL not found");
      }
      if (isSslczMethod && !fullyByWallet) {
        const s = await createSslcz({ data: { orderId: newId } });
        if (s?.redirectURL) { window.location.href = s.redirectURL; return; }
        throw new Error("SSLCommerz Gateway URL not found");
      }
      
      navigate({ to: "/orders/$id", params: { id: newId }, search: { new: 1 } });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  const applyCouponNow = () => {
    navigate({ to: "/checkout", search: { coupon: couponInput.trim().toUpperCase() }, replace: true });
  };

  if (authLoading || !cartReady) {
    return (
      <div className="h-screen w-screen grid place-items-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-screen w-screen grid place-items-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-slate-500" />
          <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
          <p className="text-slate-400 mb-8">Add a subscription before checking out.</p>
          <Link to="/" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition">
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit = 
    !errors.name && !errors.email && !errors.phone &&
    !busy &&
    !(isWalletMethod && walletInsufficient) &&
    (isGatewayMethod || isWalletMethod || (form.trxId && form.senderNumber && !errors.trxId && !errors.senderNumber));

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 flex flex-col md:items-center md:justify-center overflow-hidden font-sans text-slate-200 relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-600/10 blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full h-full md:h-[90vh] md:max-h-[850px] md:max-w-6xl md:rounded-[2rem] bg-slate-900/80 backdrop-blur-2xl border-0 md:border md:border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden flex-1">
        
        {/* Left Side: Forms & Payment */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-white/5">
          {/* Header Area */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-slate-900/50 shrink-0">
             <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold text-sm">Back to Shop</span>
             </Link>
             <div className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Secure</span>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6 md:space-y-8 pb-32 md:pb-8">
            
            {/* Customer Details Compact */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <User className="w-5 h-5 text-indigo-400" /> Customer Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500"><User className="w-4 h-4"/></div>
                  <input type="text" placeholder="Full Name" value={form.name} onChange={e => update("name", e.target.value)} onBlur={() => blur("name")}
                    className={`w-full h-11 pl-10 pr-4 bg-slate-800/50 border ${touched.name && errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-colors`}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500"><Phone className="w-4 h-4"/></div>
                  <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => update("phone", e.target.value)} onBlur={() => blur("phone")}
                    className={`w-full h-11 pl-10 pr-4 bg-slate-800/50 border ${touched.phone && errors.phone ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-colors`}
                  />
                </div>
                <div className="relative md:col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500"><Mail className="w-4 h-4"/></div>
                  <input type="email" placeholder="Email Address" value={form.email} onChange={e => update("email", e.target.value)} onBlur={() => blur("email")}
                    className={`w-full h-11 pl-10 pr-4 bg-slate-800/50 border ${touched.email && errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-colors`}
                  />
                </div>
              </div>
            </section>

            {/* Payment Method Selection */}
            <section className="space-y-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-purple-400" /> Payment Method
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scroll">
                {methods.map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`shrink-0 snap-start relative px-5 py-3 rounded-xl border flex items-center gap-3 transition-all ${method === m.id ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 bg-slate-800/50 hover:bg-slate-800'}`}
                  >
                    {m.logo_url ? <img src={m.logo_url} alt={m.name} className="h-6 w-auto" /> : <div className={`w-3 h-3 rounded-full ${m.color.replace('bg-', 'bg-[') + ']'}`} style={{backgroundColor: m.brand_color}}/>}
                    <span className={`text-sm font-semibold ${method === m.id ? 'text-white' : 'text-slate-300'}`}>{m.name}</span>
                    {method === m.id && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_5px_#6366f1]" />}
                  </button>
                ))}
                {walletBalance > 0 && (
                   <button onClick={() => setMethod("wallet")}
                    className={`shrink-0 snap-start relative px-5 py-3 rounded-xl border flex items-center gap-3 transition-all ${method === "wallet" ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 bg-slate-800/50 hover:bg-slate-800'}`}
                  >
                    <div className="p-1 rounded bg-teal-500/20"><CreditCard className="w-4 h-4 text-teal-400"/></div>
                    <span className={`text-sm font-semibold ${method === "wallet" ? 'text-white' : 'text-slate-300'}`}>Wallet (৳{walletBalance})</span>
                    {method === "wallet" && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_5px_#6366f1]" />}
                  </button>
                )}
              </div>
            </section>

            {/* Payment Instructions & Details */}
            {!isGatewayMethod && !isWalletMethod && (
              <section className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 md:p-5 space-y-5">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/50 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor: selectedMethod.brand_color || '#6366f1'}} />
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{selectedMethod.name} Number (Personal)</p>
                    <p className="text-2xl font-black text-white tracking-wider">{selectedMethod.number}</p>
                  </div>
                  <button onClick={copyNumber} className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold text-white">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-slate-400 ml-1">Sender Number</label>
                     <input type="tel" placeholder="e.g. 017XXXXXXXX" value={form.senderNumber} onChange={e => update("senderNumber", e.target.value)} onBlur={() => blur("senderNumber")}
                       className={`w-full h-11 px-4 bg-slate-900/50 border ${touched.senderNumber && errors.senderNumber ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-slate-400 ml-1">Transaction ID</label>
                     <input type="text" placeholder="e.g. 9F6A2B8C" value={form.trxId} onChange={e => update("trxId", e.target.value)} onBlur={() => blur("trxId")}
                       className={`w-full h-11 px-4 bg-slate-900/50 border ${touched.trxId && errors.trxId ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-white uppercase focus:outline-none focus:border-indigo-500 transition-colors`}
                     />
                   </div>
                </div>

                {/* Screenshot Upload Compact */}
                <div className="flex items-center gap-3 mt-2">
                   <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/50 border border-white/10 hover:bg-white/10 transition-colors rounded-lg text-xs font-semibold cursor-pointer w-full text-slate-300">
                     {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                     {screenshotUrl ? "Screenshot Uploaded" : "Upload Screenshot (Optional)"}
                     <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                   </label>
                   {screenshotUrl && (
                     <button onClick={() => setScreenshotUrl("")} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                       <X className="w-4 h-4" />
                     </button>
                   )}
                </div>
              </section>
            )}

            {isWalletMethod && walletInsufficient && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium flex items-start gap-3">
                 <Lock className="w-5 h-5 shrink-0" />
                 <p>Your wallet balance (৳{walletBalance}) is insufficient. Please select another payment method or top up your wallet.</p>
              </div>
            )}
            
            {err && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-pulse">
                {err}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Order Summary & Pay */}
        <div className="w-full md:w-[380px] lg:w-[420px] bg-slate-950/60 backdrop-blur-3xl flex flex-col h-auto md:h-full shrink-0 border-t md:border-t-0 md:border-l border-white/5 absolute md:relative bottom-0 left-0 z-20 rounded-t-3xl md:rounded-none">
          <div className="flex-1 flex flex-col p-5 md:p-8 overflow-hidden h-full">
            <h3 className="text-xl font-black text-white mb-5 hidden md:block">Order Summary</h3>
            
            {/* Scrollable Items list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 hidden md:block space-y-3 mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-xl bg-slate-900/40 border border-white/5 items-center">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                     {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-200 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{item.planPeriod}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-white">{format(item.price * item.qty)}</p>
                     <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Totals Section */}
            <div className="mt-auto space-y-4 pt-2 md:pt-4 md:border-t border-white/10 bg-slate-950/80 md:bg-transparent -mx-5 px-5 md:mx-0 md:px-0">
              
              {/* Promo Code Compact */}
              <div className="flex gap-2">
                <input type="text" placeholder="Promo code" value={couponInput} onChange={e => setCouponInput(e.target.value)}
                  className="flex-1 h-10 px-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-white uppercase focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button onClick={applyCouponNow} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors border border-white/10">Apply</button>
              </div>
              {applied.valid && applied.code && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> {applied.code} applied</span>
                  <span className="text-xs font-bold text-green-400">-{format(applied.discount)}</span>
                </div>
              )}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="text-white font-medium">{format(total)}</span>
                </div>
                {applied.discount > 0 && (
                  <div className="flex justify-between text-green-400 font-medium">
                    <span>Discount</span>
                    <span>-{format(applied.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-3 border-t border-white/5 mt-3">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-xs mb-1">Total to Pay</span>
                  <span className="text-2xl font-black text-white" style={{background: 'linear-gradient(to right, #a5b4fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                    {format(grandTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-14 relative rounded-xl font-black uppercase tracking-widest text-sm text-white overflow-hidden group transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_10px_40px_-5px_rgba(99,102,241,0.7)]"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4"/> Confirm Payment</>}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
