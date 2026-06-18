import { useMemo } from "react";
import { History, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useRecentlyViewedSlugs } from "@/hooks/useRecentlyViewed";
import { ProductCard } from "@/components/ProductCard";

type Props = {
  /** Max cards to display. Defaults to 8. */
  limit?: number;
  /** Optional slug to hide (e.g. current product page). */
  excludeSlug?: string;
  /** Compact spacing for embedding in other pages. */
  compact?: boolean;
};

export function RecentlyViewedSection({ limit = 8, excludeSlug, compact = false }: Props) {
  const { products } = useProducts();
  const { slugs, clear } = useRecentlyViewedSlugs();

  const items = useMemo(() => {
    if (!slugs.length || !products.length) return [];
    const map = new Map(products.map((p) => [p.slug, p] as const));
    const out = [] as ReturnType<typeof Array.from<typeof products[number]>>;
    for (const s of slugs) {
      if (excludeSlug && s === excludeSlug) continue;
      const p = map.get(s);
      if (p) out.push(p);
      if (out.length >= limit) break;
    }
    return out;
  }, [slugs, products, excludeSlug, limit]);

  if (!items.length) return null;

  return (
    <section
      className={`mx-auto max-w-[1440px] px-4 md:px-10 ${compact ? "py-6" : "py-10"}`}
      aria-labelledby="recently-viewed-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_8px_22px_-10px_rgba(124,58,237,0.55)] ring-1 ring-white/25">
            <History className="h-3 w-3" />
            History
          </span>
          <h2
            id="recently-viewed-title"
            className="mt-3 text-2xl md:text-3xl font-extrabold text-foreground"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.08 }}
          >
            Recently Viewed Products
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products you viewed before — quickly access them again.
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-foreground/[0.04] transition"
          aria-label="ক্লিয়ার রিসেন্ট হিস্টরি"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {items.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
