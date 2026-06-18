import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft, Loader2, Copy, Check, Crown, Download, PartyPopper, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { CartIcon } from "@/components/CartIcon";
import { AccountIcon } from "@/components/AccountIcon";
import { downloadReceiptPdf } from "@/lib/receipt";
import { sendInvoiceEmail } from "@/lib/email/invoice";
import { toast } from "sonner";

const orderSearchSchema = z.object({
  new: fallback(z.union([z.literal(0), z.literal(1)]), 0).default(0),
});

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetailPage,
  validateSearch: zodValidator(orderSearchSchema),
  head: () => ({ meta: [{ title: "Order Details — AccessNow BD" }] }),
});

type OrderItem = { slug: string; planPeriod: string; qty: number; name?: string; emoji?: string; gradient?: string; price?: number };
type Order = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  transaction_id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusSteps = ["pending", "processing", "delivered"];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { new: isNew } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      rememberReturnTo();
      navigate({ to: "/login" });
      return;
    }
    if (user) {
      supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) setNotFound(true);
          else setOrder(data as unknown as Order);
          setLoading(false);
        });
    }
  }, [id, user, authLoading, navigate]);

  // Auto-download receipt the first time a freshly placed order loads.
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!order || downloading) return;
    setDownloading(true);
    const tId = toast.loading("Generating receipt PDF…");
    try {
      // Yield to the browser so the loading state paints before jsPDF blocks.
      await new Promise((r) => setTimeout(r, 50));
      downloadReceiptPdf(order);
      toast.success("Receipt downloaded", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate receipt. Please try again.", { id: tId });
    } finally {
      setDownloading(false);
    }
  };

  const [emailingInvoice, setEmailingInvoice] = useState(false);
  const handleEmailInvoice = async () => {
    if (!order || emailingInvoice) return;
    setEmailingInvoice(true);
    const tId = toast.loading("Sending invoice…");
    try {
      const res = await sendInvoiceEmail(order);
      if (res.success) toast.success(`Invoice emailed to ${order.email}`, { id: tId });
      else if (res.reason === "email_suppressed")
        toast.error("This email has unsubscribed and cannot receive mail.", { id: tId });
      else toast.error("Could not send invoice.", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to send invoice.", { id: tId });
    } finally {
      setEmailingInvoice(false);
    }
  };

  useEffect(() => {
    if (isNew && order && !autoDownloaded) {
      setAutoDownloaded(true);
      const t = setTimeout(() => { void handleDownload(); }, 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, order, autoDownloaded]);

  const copyId = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="glass-strong rounded-3xl p-10 text-center max-w-md">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This order doesn't exist or you don't have access to it.</p>
          <Link to="/orders" className="inline-block mt-5 h-11 leading-[44px] px-6 rounded-full bg-aurora text-white text-sm font-semibold glow-violet">
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  const stepIndex = statusSteps.indexOf(order.status);
  const itemsTotal = order.items.reduce((s, it) => s + (it.price ?? 0) * it.qty, 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-soft">
        <div className="mx-auto max-w-[1440px] px-4 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg" style={{ fontFamily: "var(--font-heading)" }}>
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-aurora text-white"><Crown className="w-4 h-4" /></span>
            AccessNow <span className="text-aurora">BD</span>
          </Link>
          <div className="flex items-center gap-1.5"><AccountIcon /><CartIcon /></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-4 md:px-10 py-8">
        {isNew ? (
          <Link to="/orders" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> View all orders
          </Link>
        ) : (
          <Link to="/orders" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to my orders
          </Link>
        )}

        {isNew && (
          <div className="mb-5 rounded-3xl p-6 md:p-7 bg-aurora text-primary-foreground glow-aqua relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  Order placed successfully!
                </h2>
                <p className="text-sm text-white/85 mt-1">
                  We're verifying your payment now. You'll receive your subscription details on{" "}
                  <span className="font-semibold">{order.email}</span> within 5–30 minutes.
                </p>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {downloading ? "Generating…" : autoDownloaded ? "Download receipt again" : "Download receipt"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order header */}
        <div className="glass-strong rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Order</div>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  #{order.id.slice(0, 8).toUpperCase()}
                </h1>
                <button
                  onClick={copyId}
                  className="grid place-items-center w-8 h-8 rounded-full hover:bg-white/60 text-muted-foreground"
                  aria-label="Copy order ID"
                >
                  {copied ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Placed on {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full glass-soft text-sm font-semibold hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloading ? "Generating…" : "Receipt"}
              </button>
              <button
                onClick={handleEmailInvoice}
                disabled={emailingInvoice}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full glass-soft text-sm font-semibold hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {emailingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {emailingInvoice ? "Sending…" : "Email invoice"}
              </button>
              <span className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border ${statusStyles[order.status] || "bg-secondary text-foreground border-border"}`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Status tracker */}
          {order.status !== "cancelled" && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                {statusSteps.map((s, i) => {
                  const reached = i <= stepIndex;
                  return (
                    <div key={s} className="flex-1 flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full ${reached ? "bg-aurora" : "bg-border/60"}`} />
                      <span className={`text-[10px] uppercase tracking-wider font-bold whitespace-nowrap ${reached ? "text-primary" : "text-muted-foreground"}`}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-5">
          {/* Items */}
          <div className="md:col-span-2 glass rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Items ({order.items.length})</h2>
            <div className="space-y-3">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/40">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${it.gradient ?? "from-primary to-primary-dark"} grid place-items-center text-2xl`}>
                    {it.emoji ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{it.name ?? it.slug}</div>
                    <div className="text-xs text-muted-foreground">{it.planPeriod} subscription</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Qty {it.qty}</div>
                    {it.price ? (
                      <div className="text-sm font-bold text-aurora">৳{(it.price * it.qty).toLocaleString()}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/50 mt-5 pt-4 space-y-2 text-sm">
              {itemsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>৳{itemsTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className="text-[var(--color-aqua-deep)] font-semibold">FREE</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border/50">
                <span className="font-bold">Total Paid</span>
                <span className="text-2xl font-extrabold text-aurora" style={{ fontFamily: "var(--font-display)" }}>
                  ৳{Number(order.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar — payment + customer */}
          <div className="space-y-5">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Payment</h2>
              <div className="space-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Method</div>
                  <div className="font-bold capitalize">{order.payment_method}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Transaction ID</div>
                  <div className="font-mono font-semibold text-xs break-all" style={{ fontFamily: "var(--font-mono)" }}>{order.transaction_id}</div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Customer</h2>
              <div className="space-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-semibold">{order.full_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-semibold break-all">{order.email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-semibold">{order.phone}</div>
                </div>
              </div>
            </div>

            <Link
              to="/orders"
              className="block text-center h-11 leading-[44px] rounded-full glass-strong text-sm font-semibold hover:bg-white transition"
            >
              View all orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
