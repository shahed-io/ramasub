import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Tag, X, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useCart } from "@/context/CartContext";
import { useAppliedCoupon } from "@/lib/coupons";
import { waOrderUrl } from "@/lib/whatsapp";
import { useShopConfig } from "@/hooks/useShopConfig";

const cartSearchSchema = z.object({
  coupon: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/cart")({
  component: CartPage,
  validateSearch: zodValidator(cartSearchSchema),
  head: () => ({ meta: [{ title: "Your Cart — AccessNow BD" }] }),
});

function CartPage() {
  const { items, remove, setQty, total, count } = useCart();
  const navigate = useNavigate();
  const { coupon } = Route.useSearch();
  const { data: shopConfig } = useShopConfig();

  const applied = useAppliedCoupon(coupon, total);
  const [input, setInput] = useState(coupon);
  useEffect(() => { setInput(coupon); }, [coupon]);

  const setCouponParam = (val: string) =>
    navigate({ to: "/cart", search: { coupon: val }, replace: true });

  const grandTotal = Math.max(0, total - applied.discount);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Continue shopping
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Your Cart
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {count} {count === 1 ? "item" : "items"}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card text-card-foreground py-20 px-6 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Your cart is empty
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Looks like you haven't added anything yet. Browse our subscriptions to get started.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center justify-center mt-6 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition shadow-sm"
            >
              Browse subscriptions
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
            {/* Items list */}
            <ul className="space-y-3">
              {items.map((it) => {
                const lineTotal = it.price * it.qty;
                return (
                  <li
                    key={`${it.slug}-${it.planPeriod}`}
                    className="rounded-2xl border border-border bg-card text-card-foreground p-4 flex gap-4 shadow-sm hover:border-primary/40 transition"
                  >
                    <div
                      className={`w-20 h-20 shrink-0 rounded-xl bg-gradient-to-br ${it.gradient} grid place-items-center text-3xl shadow-inner`}
                    >
                      {it.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3
                            className="text-sm font-semibold text-foreground truncate"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {it.name || it.slug}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {it.planPeriod} · ৳{it.price.toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(it.slug, it.planPeriod)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove ${it.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div
                          className="inline-flex items-center rounded-full border border-border bg-muted text-foreground"
                          role="group"
                          aria-label="Quantity"
                        >
                          <button
                            onClick={() => setQty(it.slug, it.planPeriod, it.qty - 1)}
                            className="w-9 h-9 grid place-items-center hover:text-primary rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                            {it.qty}
                          </span>
                          <button
                            onClick={() => setQty(it.slug, it.planPeriod, it.qty + 1)}
                            className="w-9 h-9 grid place-items-center hover:text-primary rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span
                          className="text-base font-bold text-primary tabular-nums"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          ৳{lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <aside className="rounded-2xl border border-border bg-card text-card-foreground p-5 lg:sticky lg:top-6 shadow-sm">
              <h2
                className="text-base font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Order Summary
              </h2>

              {/* Coupon */}
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCouponParam(input.trim().toUpperCase());
                }}
              >
                <label htmlFor="coupon" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Coupon code
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="coupon"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    placeholder="SAVE10"
                    className="flex-1 h-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 text-sm font-medium tracking-wider uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
                    aria-invalid={coupon ? !applied.valid : undefined}
                    aria-describedby="coupon-status"
                  />
                  {applied.valid ? (
                    <button
                      type="button"
                      onClick={() => setCouponParam("")}
                      className="h-10 px-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted inline-flex items-center gap-1 transition"
                      aria-label="Remove coupon"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                    >
                      Apply
                    </button>
                  )}
                </div>
                <p
                  id="coupon-status"
                  className="text-[11px] mt-1.5 min-h-[14px]"
                  role={coupon && !applied.valid ? "alert" : undefined}
                >
                  {applied.valid ? (
                    <span className="text-emerald-500 inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> {applied.label} applied
                    </span>
                  ) : coupon ? (
                    <span className="text-destructive">{applied.reason || "Invalid coupon code"}</span>
                  ) : (
                    <span className="text-muted-foreground">Have a code? Enter it above.</span>
                  )}
                </p>
              </form>

              {/* Totals */}
              <div className="mt-4 border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium tabular-nums">৳{total.toLocaleString()}</span>
                </div>
                {applied.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-500">Discount</span>
                    <span className="text-emerald-500 font-medium tabular-nums">−৳{applied.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3 mt-2">
                  <span className="text-base font-semibold text-foreground">Total</span>
                  <span
                    className="text-xl font-bold text-primary tabular-nums"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 space-y-2.5">
                <button
                  onClick={() =>
                    navigate({
                      to: "/checkout",
                      search: { step: 1, coupon: applied.valid ? applied.code : "" },
                    })
                  }
                  className="w-full h-12 rounded-full text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg shadow-primary/25"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)" }}
                >
                  Proceed to Checkout
                </button>
                <a
                  href={waOrderUrl(items, { number: shopConfig?.whatsapp_number })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-12 w-full rounded-full bg-[#25D366] text-white text-sm font-bold hover:opacity-90 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Order via WhatsApp
                </a>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground inline-flex items-center gap-1.5 justify-center w-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure payment with bKash &amp; Nagad
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
