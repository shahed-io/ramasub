import type { CartItem } from "@/context/CartContext";
import { GlassCard } from "./GlassCard";

interface OrderSummaryProps {
  items: CartItem[];
  total: number;
  /** Optional discount in BDT to subtract from total. */
  discount?: number;
  /** Optional coupon code label, displayed alongside the discount line. */
  couponCode?: string;
  /** Shown under the total line. Defaults to a privacy note. */
  footer?: string;
  /** Show as a tall scrollable mini-summary (checkout) vs simple subtotal/delivery (cart). */
  variant?: "lineitems" | "totals";
  /** Optional CTA / extra slot rendered above footer text (e.g. Proceed button). */
  action?: React.ReactNode;
  /** Optional slot rendered between the totals block and the action (e.g. coupon input). */
  extra?: React.ReactNode;
  className?: string;
}

export function OrderSummary({
  items,
  total,
  discount = 0,
  couponCode,
  footer = "Your data is safe. We never share your details.",
  variant = "lineitems",
  action,
  extra,
  className,
}: OrderSummaryProps) {
  const grandTotal = Math.max(0, total - discount);
  return (
    <GlassCard className={`h-fit lg:sticky lg:top-6 text-foreground ${className ?? ""}`}>
      <h3 className="text-foreground" style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600 }}>
        Order summary
      </h3>

      {variant === "lineitems" ? (
        <div className="mt-4 space-y-3 max-h-[260px] overflow-auto pr-1">
          {items.map((it) => (
            <div key={`${it.slug}-${it.planPeriod}`} className="flex gap-3 items-center">
              <div
                className={`w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br ${it.gradient} grid place-items-center text-xl`}
              >
                {it.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{it.name || it.slug}</div>
                <div className="text-xs text-muted-foreground">
                  {it.planPeriod} × {it.qty}
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">
                ৳{(it.price * it.qty).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-semibold">৳{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className="text-emerald-600 font-semibold">FREE</span>
          </div>
        </div>
      )}

      {discount > 0 && (
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-emerald-600 font-medium">
            Coupon{couponCode ? ` (${couponCode})` : ""}
          </span>
          <span className="text-emerald-600 font-semibold">−৳{discount.toLocaleString()}</span>
        </div>
      )}

      {extra}

      <div className="border-t border-border my-4" />
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span
          className="text-2xl font-semibold text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          ৳{grandTotal.toLocaleString()}
        </span>
      </div>

      {action}

      {footer && (
        <p className="text-[11px] text-muted-foreground text-center mt-3">{footer}</p>
      )}
    </GlassCard>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5 break-words">{value || "—"}</dd>
    </div>
  );
}
