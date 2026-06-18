import { useEffect, useMemo, useRef, useState } from "react";
import { optimizeSupabaseImage } from "@/lib/image-url";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  Loader2,
  Clock,
  TrendingUp,
  ChevronRight,
  CornerDownLeft,
  Tag,
  LayoutGrid,
  Play,
  Sparkles,
  GraduationCap,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/data/products";

const RECENT_KEY = "globalSearch:recent";
const TRENDING = ["Netflix", "ChatGPT", "Spotify", "Canva", "YouTube", "Coursera"];

type QuickLink = {
  label: string;
  bn: string;
  to: "/products" | "/streaming" | "/ai-tools" | "/education" | "/faq" | "/contact";
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadow: string;
  hoverText: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    label: "All Subscriptions",
    bn: "সব সাবস্ক্রিপশন",
    to: "/products",
    hint: "Browse the full catalog",
    icon: LayoutGrid,
    gradient: "from-indigo-500 to-violet-500",
    shadow: "shadow-indigo-200/60",
    hoverText: "group-hover:text-indigo-500",
  },
  {
    label: "Streaming",
    bn: "স্ট্রিমিং",
    to: "/streaming",
    hint: "Netflix, Prime, Disney+ & more",
    icon: Play,
    gradient: "from-violet-500 to-fuchsia-500",
    shadow: "shadow-violet-200/60",
    hoverText: "group-hover:text-violet-500",
  },
  {
    label: "AI Tools",
    bn: "এআই টুলস",
    to: "/ai-tools",
    hint: "ChatGPT, Claude, Midjourney…",
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-cyan-500",
    shadow: "shadow-fuchsia-200/60",
    hoverText: "group-hover:text-fuchsia-500",
  },
  {
    label: "Education",
    bn: "শিক্ষা",
    to: "/education",
    hint: "Coursera, Udemy, Skillshare",
    icon: GraduationCap,
    gradient: "from-cyan-400 to-indigo-500",
    shadow: "shadow-cyan-200/60",
    hoverText: "group-hover:text-cyan-500",
  },
  {
    label: "FAQ",
    bn: "সাধারণ প্রশ্ন",
    to: "/faq",
    hint: "Common questions",
    icon: HelpCircle,
    gradient: "from-sky-400 to-indigo-500",
    shadow: "shadow-sky-200/60",
    hoverText: "group-hover:text-sky-500",
  },
  {
    label: "Contact",
    bn: "যোগাযোগ",
    to: "/contact",
    hint: "Talk to support",
    icon: MessageCircle,
    gradient: "from-emerald-400 to-cyan-500",
    shadow: "shadow-emerald-200/60",
    hoverText: "group-hover:text-emerald-500",
  },
];

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(term: string) {
  if (typeof window === "undefined") return;
  const t = term.trim();
  if (!t) return;
  const prev = loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function highlight(text: string, needle: string) {
  const tokens = needle.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const lowerSet = new Set(tokens.map((t) => t.toLowerCase()));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        lowerSet.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="bg-indigo-100 text-indigo-700 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function fuzzyIncludes(hay: string, n: string): boolean {
  if (!n) return true;
  let i = 0;
  for (let j = 0; j < hay.length && i < n.length; j++) {
    if (hay[j] === n[i]) i++;
  }
  return i === n.length;
}

function scoreProduct(p: Product, needle: string): number {
  const raw = needle.toLowerCase().trim();
  if (!raw) return 0;
  const name = p.name.toLowerCase();
  const tag = (p.tagline ?? "").toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  const cat = p.category.toLowerCase();
  const badge = (p.badge ?? "").toLowerCase();
  const features = (p.features ?? []).join(" ").toLowerCase();
  const hay = `${name} ${tag} ${cat} ${badge} ${desc} ${features}`;

  const tokens = raw.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const t of tokens) {
    let s = 0;
    if (name === t) s = 1000;
    else if (name.startsWith(t)) s = 800;
    else if (name.includes(t)) s = 600;
    else if (cat.startsWith(t)) s = 450;
    else if (cat.includes(t)) s = 350;
    else if (tag.includes(t)) s = 280;
    else if (badge.includes(t)) s = 220;
    else if (desc.includes(t)) s = 160;
    else if (features.includes(t)) s = 140;
    else if (fuzzyIncludes(name, t)) s = 90;
    else if (fuzzyIncludes(hay, t)) s = 40;
    else return 0;
    score += s;
  }
  return score;
}

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { products, isLoading } = useProducts();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const needle = q.trim();

  const matches = useMemo<Product[]>(() => {
    if (!needle) return [];
    return products
      .map((p) => ({ p, s: scoreProduct(p, needle) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.p);
  }, [products, needle]);

  const categoryMatches = useMemo(() => {
    if (!needle) return [];
    const n = needle.toLowerCase();
    const set = new Set<string>();
    for (const p of products) {
      if (p.category.toLowerCase().includes(n)) set.add(p.category);
    }
    return Array.from(set).slice(0, 4);
  }, [products, needle]);

  const flatItems = useMemo(() => {
    const list: Array<{ kind: "product" | "category" | "submit"; value: string; product?: Product }> = [];
    if (needle) {
      list.push({ kind: "submit", value: needle });
      for (const p of matches) list.push({ kind: "product", value: p.slug, product: p });
      for (const c of categoryMatches) list.push({ kind: "category", value: c });
    }
    return list;
  }, [needle, matches, categoryMatches]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = (item: (typeof flatItems)[number]) => {
    saveRecent(needle || item.value);
    onOpenChange(false);
    if (item.kind === "product" && item.product) {
      navigate({ to: "/product/$slug", params: { slug: item.product.slug } });
    } else if (item.kind === "category") {
      navigate({ to: "/products", search: { q: item.value } as never });
    } else {
      navigate({ to: "/products", search: { q: needle || item.value } as never });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems.length > 0) {
        go(flatItems[active]);
      } else if (needle) {
        saveRecent(needle);
        onOpenChange(false);
        navigate({ to: "/products", search: { q: needle } as never });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-[760px] border border-slate-200 bg-white overflow-hidden rounded-2xl shadow-[0_32px_64px_-16px_rgba(15,23,42,0.25)] text-slate-800"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* Input row */}
        <div className="px-6 pt-5 pb-4 border-b border-black/5">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white shadow-sm pl-4 pr-1.5 h-12">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="প্রোডাক্ট সার্চ করুন..."
              className="flex-1 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none text-base font-medium text-slate-800 placeholder:text-slate-400"
              autoComplete="off"
              spellCheck={false}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="grid place-items-center w-8 h-8 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => needle && go({ kind: "submit", value: needle })}
              className="grid place-items-center w-9 h-9 rounded-full text-primary hover:bg-primary/10 transition shrink-0"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-8">
          {needle ? (
            <>
              {/* Direct search action */}
              <button
                onClick={() => go({ kind: "submit", value: needle })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
                  active === 0
                    ? "bg-white/90 shadow-sm border border-white"
                    : "hover:bg-white/80 border border-transparent hover:border-white"
                }`}
              >
                <div className="w-10 h-10 grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-200/60">
                  <Search className="w-5 h-5" />
                </div>
                <span className="flex-1 text-sm text-slate-700 truncate">
                  Search for "<span className="font-semibold text-slate-900">{needle}</span>" in all products
                </span>
                <CornerDownLeft className="w-4 h-4 text-slate-400" />
              </button>

              {/* Product matches */}
              {matches.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                    Products / প্রোডাক্টস
                  </h3>
                  <div className="space-y-2">
                    {matches.map((p, i) => {
                      const idx = i + 1;
                      const isActive = active === idx;
                      return (
                        <button
                          key={p.slug}
                          onClick={() => go({ kind: "product", value: p.slug, product: p })}
                          onMouseEnter={() => setActive(idx)}
                          className={`group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 border ${
                            isActive
                              ? "bg-white/90 shadow-sm border-white"
                              : "border-transparent hover:bg-white/80 hover:shadow-sm hover:border-white"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 grid place-items-center rounded-xl text-lg bg-gradient-to-br ${p.gradient} text-white shadow-lg`}
                          >
                            {p.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-700 truncate">
                              {highlight(p.name, needle)}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.tagline || p.category}
                            </div>
                          </div>
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                            {p.category}
                          </span>
                          <ChevronRight
                            className={`w-5 h-5 text-slate-300 transition-colors ${
                              isActive ? "text-indigo-500" : "group-hover:text-indigo-500"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Category matches */}
              {categoryMatches.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                    Categories / ক্যাটাগরি
                  </h3>
                  <div className="space-y-2">
                    {categoryMatches.map((c, i) => {
                      const idx = 1 + matches.length + i;
                      const isActive = active === idx;
                      return (
                        <button
                          key={c}
                          onClick={() => go({ kind: "category", value: c })}
                          onMouseEnter={() => setActive(idx)}
                          className={`group w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 border ${
                            isActive
                              ? "bg-white/90 shadow-sm border-white"
                              : "border-transparent hover:bg-white/80 hover:shadow-sm hover:border-white"
                          }`}
                        >
                          <div className="w-10 h-10 grid place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200/60">
                            <Tag className="w-5 h-5" />
                          </div>
                          <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                            {highlight(c, needle)}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Category
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {matches.length === 0 && categoryMatches.length === 0 && !isLoading && (
                <div className="px-4 py-10 text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-sm text-slate-700">
                    No matches for "<span className="font-semibold text-slate-900">{needle}</span>"
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Press Enter to browse all products.
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* সাম্প্রতিক সার্চ */}
              {recent.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-500">
                        সাম্প্রতিক সার্চ
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                        setRecent([]);
                      }}
                      className="text-sm font-medium text-indigo-500 hover:text-indigo-700"
                    >
                      সব মুছুন
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recent.map((r) => (
                      <div
                        key={r}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => setQ(r)}
                      >
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="flex-1 text-sm font-semibold text-slate-800 truncate">
                          {r}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = recent.filter((x) => x !== r);
                            setRecent(next);
                            try {
                              localStorage.setItem(RECENT_KEY, JSON.stringify(next));
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="grid place-items-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
                          aria-label="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* জনপ্রিয় সার্চ — real trending products */}
              {products.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-500">
                      জনপ্রিয় সার্চ
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {products.slice(0, 8).map((p) => (
                      <button
                        key={`pop-${p.slug}`}
                        onClick={() => setQ(p.name)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f8fafc] transition text-left"
                      >
                        <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="flex-1 text-sm font-semibold text-slate-800 truncate">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ট্রেন্ডিং প্রোডাক্ট */}
              {products.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Sparkles className="w-4 h-4 text-fuchsia-500" />
                    <h3 className="text-sm font-semibold text-slate-500">
                      ট্রেন্ডিং প্রোডাক্ট
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {products
                      .slice(0, 3)
                      .map((p) => {
                        const plan = p.plans?.[0];
                        return (
                          <Link
                            key={p.slug}
                            to="/product/$slug"
                            params={{ slug: p.slug }}
                            onClick={() => onOpenChange(false)}
                            className="group flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition"
                          >
                            <div
                              className={`w-12 h-12 grid place-items-center rounded-xl text-xl bg-gradient-to-br ${p.gradient} text-white shadow-md shrink-0 overflow-hidden`}
                            >
                              {p.imageUrl ? (
                                <img
                                  src={optimizeSupabaseImage(p.imageUrl, { width: 96, quality: 65 })}
                                  alt={p.name}
                                  loading="lazy"
                                  decoding="async"
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { const img = e.currentTarget; if (p.imageUrl && img.src !== p.imageUrl) img.src = p.imageUrl; }}
                                />
                              ) : (
                                <span>{p.emoji}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {p.name}
                                </span>
                                {p.badge && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {p.tagline || p.category}
                              </p>
                            </div>
                            {plan?.price && (
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-indigo-600">
                                  ৳{plan.price}
                                </div>
                                {plan.original && (
                                  <div className="text-[11px] text-slate-400 line-through">
                                    ৳{plan.original}
                                  </div>
                                )}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-black/5 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <kbd className="flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-200 text-slate-500 shadow-sm">
                ↑
              </kbd>
              <kbd className="flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-200 text-slate-500 shadow-sm">
                ↓
              </kbd>
              <span className="ml-1">নেভিগেট</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="flex items-center justify-center px-1.5 h-5 rounded bg-white border border-slate-200 text-slate-500 shadow-sm uppercase text-[10px]">
                Enter
              </kbd>
              <span className="ml-1">সিলেক্ট</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <kbd className="flex items-center justify-center px-1.5 h-5 rounded bg-white border border-slate-200 text-slate-500 shadow-sm uppercase text-[10px]">
                Esc
              </kbd>
              <span className="ml-1">বন্ধ</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Google-style Search
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Hook: provides open state and binds Cmd/Ctrl+K and "/" shortcuts globally. */
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      const isSlash =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement);
      if (isK || isSlash) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
