import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { trackAddToCart } from "@/lib/trackEvent";


export type CartItem = {
  slug: string;
  planPeriod: string;
  qty: number;
  price: number;
  name: string;
  emoji: string;
  gradient: string;
};

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  add: (item: CartItem) => void;
  remove: (slug: string, planPeriod: string) => void;
  setQty: (slug: string, planPeriod: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "accessnow_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, ready]);

  const value = useMemo<CartCtx>(() => {
    const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    return {
      items,
      ready,
      count: items.reduce((s, i) => s + i.qty, 0),
      total,
      add: (item) =>
        setItems((cur) => {
          try {
            trackAddToCart({
              id: item.slug,
              name: item.name,
              value: item.price * item.qty,
              quantity: item.qty,
            });
          } catch {
            /* ignore */
          }
          const idx = cur.findIndex((c) => c.slug === item.slug && c.planPeriod === item.planPeriod);
          if (idx >= 0) {
            const next = [...cur];
            next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
            return next;
          }
          return [...cur, item];
        }),

      remove: (slug, planPeriod) => setItems((cur) => cur.filter((c) => !(c.slug === slug && c.planPeriod === planPeriod))),
      setQty: (slug, planPeriod, qty) =>
        setItems((cur) =>
          cur.map((c) => (c.slug === slug && c.planPeriod === planPeriod ? { ...c, qty: Math.max(1, qty) } : c)),
        ),
      clear: () => setItems([]),
    };
  }, [items, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
