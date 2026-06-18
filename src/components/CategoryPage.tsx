import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SearchBar } from "@/components/SearchBar";
import { RecentlyViewedSection } from "@/components/RecentlyViewedSection";
import {
  LayoutGrid, Sparkles, MonitorPlay, FileText, AppWindow, Music, GraduationCap,
  Shield, Gamepad2, Image as ImageIcon, Package, ChevronDown,
} from "lucide-react";

type IconType = typeof LayoutGrid;

function iconForCategory(name: string): { Icon: IconType; grad: string } {
  const n = name.toLowerCase();
  if (n.includes("ai")) return { Icon: Sparkles, grad: "from-violet-500 to-fuchsia-500" };
  if (n.includes("stream") || n.includes("netflix") || n.includes("video")) return { Icon: MonitorPlay, grad: "from-rose-500 to-red-600" };
  if (n.includes("windows")) return { Icon: AppWindow, grad: "from-sky-500 to-blue-600" };
  if (n.includes("office") || n.includes("microsoft")) return { Icon: FileText, grad: "from-orange-500 to-red-500" };
  if (n.includes("music") || n.includes("spotify")) return { Icon: Music, grad: "from-green-500 to-emerald-600" };
  if (n.includes("edu") || n.includes("course") || n.includes("learn")) return { Icon: GraduationCap, grad: "from-amber-500 to-orange-500" };
  if (n.includes("vpn") || n.includes("security")) return { Icon: Shield, grad: "from-slate-600 to-slate-800" };
  if (n.includes("game") || n.includes("gaming")) return { Icon: Gamepad2, grad: "from-fuchsia-500 to-pink-500" };
  if (n.includes("design") || n.includes("canva") || n.includes("photo")) return { Icon: ImageIcon, grad: "from-pink-500 to-rose-500" };
  if (n.includes("software")) return { Icon: MonitorPlay, grad: "from-cyan-500 to-blue-600" };
  if (n.includes("subscription") || n.includes("sub")) return { Icon: Package, grad: "from-teal-500 to-emerald-600" };
  return { Icon: Package, grad: "from-indigo-500 to-violet-600" };
}

type SortKey = "latest" | "price-asc" | "price-desc" | "name";

const parsePriceNum = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

export function CategoryPage({
  title,
  subtitle,
  filter,
  showFilters = false,
}: {
  title: string;
  subtitle: string;
  filter?: (cat: string) => boolean;
  showFilters?: boolean;
}) {
  const { products, isLoading } = useProducts();
  const navigate = useNavigate();
  const { q: urlQ = "", cat: urlCat } = useSearch({ strict: false }) as { q?: string; cat?: string };
  const [cat, setCat] = useState<string | null>(urlCat ?? null);
  const [sort, setSort] = useState<SortKey>("latest");
  const [q, setQ] = useState<string>(urlQ);
  const lastUrlQ = useRef(urlQ);
  const lastUrlCat = useRef<string | undefined>(urlCat);

  // Sync from URL when it changes externally (e.g., back/forward, header search)
  useEffect(() => {
    if (urlQ !== lastUrlQ.current && urlQ !== q) {
      setQ(urlQ);
    }
    lastUrlQ.current = urlQ;
  }, [urlQ]);

  // Sync category filter from URL (e.g. clicking a category pill)
  useEffect(() => {
    if (urlCat !== lastUrlCat.current) {
      setCat(urlCat ?? null);
      lastUrlCat.current = urlCat;
    }
  }, [urlCat]);


  // Debounce URL update so typing stays smooth and doesn't lose focus
  useEffect(() => {
    const handle = setTimeout(() => {
      if (q === urlQ) return;
      lastUrlQ.current = q;
      navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: q.trim() || undefined }) } as never);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, urlQ, navigate]);

  const updateSearch = (value: string) => setQ(value);

  const cats = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (filter && !filter(p.category)) continue;
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products, filter]);

  const totalCount = useMemo(
    () => products.filter((p) => !filter || filter(p.category)).length,
    [products, filter],
  );

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const tokens = needle.split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      if (filter && !filter(p.category)) return false;
      if (cat && p.category !== cat) return false;
      if (tokens.length === 0) return true;
      const hay = [
        p.name,
        p.tagline,
        p.category,
        p.badge ?? "",
        (p as { short_description?: string }).short_description ?? "",
        p.description ?? "",
        (p.features ?? []).join(" "),
        p.slug,
      ]
        .join(" ")
        .toLowerCase();
      // Every token must appear somewhere (AND match across fields)
      return tokens.every((t) => hay.includes(t));
    });
    const sorted = [...list];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => parsePriceNum(a.plans[0]?.price ?? "0") - parsePriceNum(b.plans[0]?.price ?? "0"));
        break;
      case "price-desc":
        sorted.sort((a, b) => parsePriceNum(b.plans[0]?.price ?? "0") - parsePriceNum(a.plans[0]?.price ?? "0"));
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return sorted;
  }, [products, q, cat, filter, sort]);

  return (
    <div className="min-h-screen">
      {/* Cinematic header band */}
      <section className="relative glass-strong overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/35 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-[var(--color-aqua)]/35 blur-[140px]" />
        <div className="relative mx-auto max-w-[1440px] px-4 md:px-10 py-10 md:py-12">
          <div className="inline-block max-w-full">
            <h1
              className="text-aurora drop-shadow-[0_2px_18px_rgba(124,92,255,0.35)] break-words [hyphens:auto]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(22px, 5vw, 44px)",
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
          </div>
          <p className="mt-2 text-foreground/70 max-w-2xl font-medium">
            {(q.trim() ? items.length : totalCount)}টি প্রোডাক্ট পাওয়া গেছে
          </p>
          <p className="mt-1 text-foreground/60 text-sm max-w-2xl">{subtitle}</p>
          <SearchBar
            value={q}
            onChange={updateSearch}
            onSubmit={updateSearch}
            placeholder="প্রোডাক্ট সার্চ করুন..."
            size="lg"
            className="mt-5 max-w-xl"
          />
        </div>
      </section>

      {!q.trim() && <RecentlyViewedSection compact />}

      <section className="mx-auto max-w-[1440px] px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          {showFilters && cats.length > 0 && (
            <aside className="lg:sticky lg:top-24 self-start">
              <div className="glass-strong rounded-3xl p-4 border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-[var(--glass-border)]">
                  <span className="block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-aqua" />
                  <h2 className="text-sm font-extrabold tracking-wide text-foreground">
                    ক্যাটাগরি
                  </h2>
                </div>

                <ul className="flex flex-col gap-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setCat(null)}
                      aria-pressed={cat === null}
                      className={`w-full group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition border ${
                        cat === null
                          ? "bg-primary/10 border-primary/40 shadow-[0_8px_24px_-12px_var(--color-primary)]"
                          : "border-transparent hover:bg-foreground/[0.04] hover:border-[var(--glass-border)]"
                      }`}
                    >
                      <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shrink-0">
                        <LayoutGrid className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold text-foreground truncate">
                          সব
                        </span>
                      </span>
                      <span className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                        cat === null ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06] text-foreground/70"
                      }`}>
                        {totalCount}
                      </span>
                    </button>
                  </li>
                  {cats.map((c) => {
                    const { Icon, grad } = iconForCategory(c.name);
                    const active = cat === c.name;
                    return (
                      <li key={c.name}>
                        <button
                          type="button"
                          onClick={() => setCat(active ? null : c.name)}
                          aria-pressed={active}
                          className={`w-full group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition border ${
                            active
                              ? "bg-primary/10 border-primary/40 shadow-[0_8px_24px_-12px_var(--color-primary)]"
                              : "border-transparent hover:bg-foreground/[0.04] hover:border-[var(--glass-border)]"
                          }`}
                        >
                          <span className={`grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br ${grad} text-white shadow-sm shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-foreground truncate">
                              {c.name}
                            </span>
                          </span>
                          <span className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                            active ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06] text-foreground/70"
                          }`}>
                            {c.count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          )}

          {/* Main */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="text-xs text-foreground/60">
                {cat ? <span><span className="text-foreground/80 font-semibold">{cat}</span> · </span> : null}
                <span className="font-semibold text-foreground/80">{items.length}</span> products
              </div>
              <label className="relative inline-flex items-center">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none rounded-full border border-[var(--glass-border)] bg-white dark:bg-slate-900 px-4 pr-9 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="latest" className="text-slate-800">সর্বশেষ</option>
                  <option value="price-asc" className="text-slate-800">দাম: কম থেকে বেশি</option>
                  <option value="price-desc" className="text-slate-800">দাম: বেশি থেকে কম</option>
                  <option value="name" className="text-slate-800">নাম (A–Z)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
              </label>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-muted-foreground text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="glass rounded-3xl py-16 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <h3 className="text-lg font-bold">No products found</h3>
                <p className="text-sm text-muted-foreground mt-2">Try a different category or search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {items.map((p) => <ProductCard key={p.slug} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
