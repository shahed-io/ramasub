import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Check, Tag, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { useState } from "react";

interface OrderSummaryProps {
  appliedDiscount: number;
  couponCode: string | null;
  couponLabel: string | null;
  isCouponValid: boolean;
  couponInput: string;
  setCouponInput: (v: string) => void;
  onApplyCoupon: () => void;
  grandTotal: number;
  productImages: Record<string, string>;
}

export function OrderSummary({
  appliedDiscount,
  couponCode,
  couponLabel,
  isCouponValid,
  couponInput,
  setCouponInput,
  onApplyCoupon,
  grandTotal,
  productImages
}: OrderSummaryProps) {
  const { items, total } = useCart();
  const { format } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sticky top-24 space-y-6">
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-2xl shadow-primary/5 overflow-hidden transition-all duration-500">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Order Summary
            </h2>
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.slug}-${item.planPeriod}`} className="flex items-center gap-4 group">
                <div className="relative shrink-0">
                  {productImages[item.slug] ? (
                    <img 
                      src={productImages[item.slug]} 
                      alt={item.name} 
                      className="w-14 h-14 rounded-2xl object-cover border border-border/50 shadow-sm transition-transform group-hover:scale-105" 
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} grid place-items-center text-xl shadow-sm transition-transform group-hover:scale-105`}>
                      {item.emoji}
                    </div>
                  )}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center shadow-lg border-2 border-card">
                    {item.qty}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                    {item.planPeriod}
                  </p>
                </div>
                <div className="text-sm font-bold text-foreground tabular-nums">
                  {format(item.price * item.qty)}
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Coupon Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Promo Code"
                  className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border/60 bg-background/50 outline-none text-sm font-medium focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <button
                onClick={onApplyCoupon}
                className="h-12 px-6 rounded-2xl bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-all active:scale-95 shadow-lg shadow-foreground/10"
              >
                Apply
              </button>
            </div>
            {couponCode && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold animate-in fade-in slide-in-from-top-2 ${isCouponValid ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                {isCouponValid ? <Check className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                {isCouponValid ? `Discount applied: ${couponLabel}` : "Invalid promo code"}
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4 border border-border/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Subtotal</span>
              <span className="text-foreground font-bold tabular-nums">{format(total)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-500 font-bold">Discount</span>
                <span className="text-emerald-500 font-bold tabular-nums">−{format(appliedDiscount)}</span>
              </div>
            )}
            <div className="h-px bg-border/40 my-2" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-foreground">Total</span>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Including Taxes</p>
              </div>
              <div className="text-2xl font-black text-primary tabular-nums tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                {format(grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="bg-foreground/[0.02] border-t border-border/40 px-8 py-5 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Secure SSL</span>
          </div>
          <div className="w-px h-6 bg-border/40" />
          <div className="flex flex-col items-center gap-1.5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
