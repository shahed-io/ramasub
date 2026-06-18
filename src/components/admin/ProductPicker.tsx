import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X, Check, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/data/products";

export type ProductPickerProps = {
  value: string; // selected slug
  onChange: (slug: string, product: Product | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  /** Filter only specific categories */
  categories?: string[];
};

/**
 * Searchable product dropdown for admin tools.
 * Shows emoji/image + name + category + first plan price.
 * Returns the selected slug AND the full product (for auto-fill).
 */
export function ProductPicker({
  value,
  onChange,
  placeholder = "প্রোডাক্ট সিলেক্ট করুন…",
  className = "",
  allowClear = true,
  categories,
}: ProductPickerProps) {
  const { products, isLoading } = useProducts();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const list = useMemo(() => {
    let arr = products;
    if (categories && categories.length > 0) {
      arr = arr.filter((p) => categories.includes(p.category));
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.slug.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle),
      );
    }
    return arr.slice(0, 60);
  }, [products, q, categories]);

  const selected = useMemo(
    () => products.find((p) => p.slug === value) ?? null,
    [products, value],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const firstPrice = (p: Product) => p.plans[0]?.price ?? "—";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-left outline-none focus:ring-2 focus:ring-primary/40 flex items-center gap-2 hover:border-primary/40 transition"
      >
        {selected ? (
          <>
            <ProductBadge product={selected} />
            <span className="flex-1 truncate font-medium text-foreground">{selected.name}</span>
            <span className="text-xs font-semibold text-primary whitespace-nowrap">
              {firstPrice(selected)}
            </span>
          </>
        ) : (
          <>
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
          </>
        )}
        {selected && allowClear ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("", null);
            }}
            className="p-0.5 rounded hover:bg-secondary"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ) : null}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border bg-card">
            <div className="flex items-center gap-2 h-9 px-2 rounded-lg bg-secondary/60 border border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="নাম, slug, ক্যাটেগরি…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">লোড হচ্ছে…</div>
            ) : list.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">কোন প্রোডাক্ট পাওয়া যায়নি</div>
            ) : (
              list.map((p) => {
                const isSel = p.slug === value;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => {
                      onChange(p.slug, p);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-2.5 text-left text-sm hover:bg-secondary/60 transition border-b border-border/40 last:border-0 ${
                      isSel ? "bg-primary/10" : ""
                    }`}
                  >
                    <ProductBadge product={p} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.category} · {p.plans.length} plan{p.plans.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-primary">{firstPrice(p)}</div>
                      {p.badge && (
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {p.badge}
                        </div>
                      )}
                    </div>
                    {isSel && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductBadge({ product }: { product: Product }) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt=""
        className="w-7 h-7 rounded-md object-cover ring-1 ring-border shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-md grid place-items-center text-base shrink-0 ring-1 ring-border"
      style={{ background: product.gradient || "linear-gradient(135deg,#e9d5ff,#c7d2fe)" }}
    >
      <span>{product.emoji || "📦"}</span>
    </div>
  );
}
