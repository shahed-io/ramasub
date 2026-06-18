import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  Loader2,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Compass,
  Package,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { ADMIN_MENU } from "@/lib/admin-menu";
import type { Product } from "@/data/products";

const RECENT_KEY = "adminSearch:recent";

const QUICK: Array<{ label: string; to: string; hint: string }> = [
  { label: "Dashboard", to: "/admin", hint: "Overview & metrics" },
  { label: "All Products", to: "/admin/products", hint: "Manage catalog" },
  { label: "Add New Product", to: "/admin/add-product", hint: "Create product" },
  { label: "Orders", to: "/admin/orders", hint: "Manage orders" },
  { label: "Users", to: "/admin/users", hint: "Manage users" },
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

function fuzzyIncludes(hay: string, n: string): boolean {
  if (!n) return true;
  let i = 0;
  for (let j = 0; j < hay.length && i < n.length; j++) {
    if (hay[j] === n[i]) i++;
  }
  return i === n.length;
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
          <mark key={i} className="bg-indigo-100 text-indigo-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type MenuHit = {
  to: string;
  label: string;
  group: string;
  score: number;
};

function scoreString(hay: string, tokens: string[]): number {
  const lower = hay.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    if (lower === t) total += 1000;
    else if (lower.startsWith(t)) total += 700;
    else if (lower.includes(t)) total += 450;
    else if (fuzzyIncludes(lower, t)) total += 90;
    else return 0;
  }
  return total;
}

function scoreProduct(p: Product, tokens: string[]): number {
  const fields = [
    p.name.toLowerCase(),
    (p.category ?? "").toLowerCase(),
    (p.tagline ?? "").toLowerCase(),
    (p.badge ?? "").toLowerCase(),
  ];
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const f of fields) {
      if (f === t) best = Math.max(best, 1000);
      else if (f.startsWith(t)) best = Math.max(best, 700);
      else if (f.includes(t)) best = Math.max(best, 450);
      else if (fuzzyIncludes(f, t)) best = Math.max(best, 80);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function AdminGlobalSearch({
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
  const tokens = needle.toLowerCase().split(/\s+/).filter(Boolean);

  const menuHits = useMemo<MenuHit[]>(() => {
    if (tokens.length === 0) return [];
    const out: MenuHit[] = [];
    for (const g of ADMIN_MENU) {
      for (const i of g.items) {
        const s =
          scoreString(i.label, tokens) +
          scoreString(g.title, tokens) * 0.2;
        if (s > 0) out.push({ to: i.to, label: i.label, group: g.title, score: s });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [tokens]);

  const productHits = useMemo<Product[]>(() => {
    if (tokens.length === 0) return [];
    return products
      .map((p) => ({ p, s: scoreProduct(p, tokens) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.p);
  }, [products, tokens]);

  type FlatItem =
    | { kind: "menu"; hit: MenuHit }
    | { kind: "product"; product: Product }
    | { kind: "search-products"; value: string };

  const flatItems = useMemo<FlatItem[]>(() => {
    const list: FlatItem[] = [];
    if (needle) list.push({ kind: "search-products", value: needle });
    for (const h of menuHits) list.push({ kind: "menu", hit: h });
    for (const p of productHits) list.push({ kind: "product", product: p });
    return list;
  }, [needle, menuHits, productHits]);

  useEffect(() => setActive(0), [q]);

  const go = (item: FlatItem) => {
    saveRecent(needle);
    onOpenChange(false);
    if (item.kind === "menu") navigate({ to: item.hit.to as never });
    else if (item.kind === "product")
      navigate({ to: "/admin/products", search: { q: item.product.name } as never });
    else navigate({ to: "/admin/products", search: { q: item.value } as never });
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
      if (flatItems.length > 0) go(flatItems[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl bg-white border-slate-200 overflow-hidden rounded-2xl shadow-[0_30px_80px_-20px_rgba(15,23,42,0.3)]">
        <DialogTitle className="sr-only">Admin search</DialogTitle>

        {/* Input row */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search admin — pages, products, orders…"
            className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
            autoComplete="off"
            spellCheck={false}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="grid place-items-center w-8 h-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center h-6 px-2 rounded-md text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {needle ? (
            <>
              {/* Direct search */}
              <button
                onClick={() => go({ kind: "search-products", value: needle })}
                onMouseEnter={() => setActive(0)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  active === 0 ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
                }`}
              >
                <Search className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="flex-1 text-sm text-slate-800 truncate">
                  Search products for "<span className="font-semibold">{needle}</span>"
                </span>
                <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {menuHits.length > 0 && (
                <div className="mt-3">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Pages
                  </div>
                  <div className="space-y-1">
                    {menuHits.map((h, i) => {
                      const idx = i + 1;
                      const isActive = active === idx;
                      return (
                        <button
                          key={h.to}
                          onClick={() => go({ kind: "menu", hit: h })}
                          onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                            isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
                          }`}
                        >
                          <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {highlight(h.label, needle)}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{h.group}</div>
                          </div>
                          <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {productHits.length > 0 && (
                <div className="mt-3">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Products
                  </div>
                  <div className="space-y-1">
                    {productHits.map((p, i) => {
                      const idx = 1 + menuHits.length + i;
                      const isActive = active === idx;
                      return (
                        <button
                          key={p.slug}
                          onClick={() => go({ kind: "product", product: p })}
                          onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                            isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`grid place-items-center w-9 h-9 rounded-lg text-base bg-gradient-to-br ${p.gradient} text-white shadow-sm`}
                          >
                            {p.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {highlight(p.name, needle)}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{p.category}</div>
                          </div>
                          <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {menuHits.length === 0 && productHits.length === 0 && !isLoading && (
                <div className="px-4 py-10 text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-sm text-slate-700">
                    No matches for "<span className="font-semibold">{needle}</span>"
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-3 pb-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Recent
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                        setRecent([]);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-3">
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => setQ(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-700 bg-slate-100 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition"
                      >
                        <Search className="w-3 h-3 text-slate-500" />
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2">
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Quick actions
                </div>
                <div className="space-y-1">
                  {QUICK.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to as never}
                      onClick={() => onOpenChange(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition group"
                    >
                      <div className="grid place-items-center w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 group-hover:border-indigo-300 transition">
                        <Package className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">{l.label}</div>
                        <div className="text-xs text-slate-500 truncate">{l.hint}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-200">
                <ArrowUp className="w-2.5 h-2.5" />
              </kbd>
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-200">
                <ArrowDown className="w-2.5 h-2.5" />
              </kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-white border border-slate-200 font-mono">
                ↵
              </kbd>
              select
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-white border border-slate-200 font-mono">
                esc
              </kbd>
              close
            </span>
          </div>
          <span className="hidden sm:inline font-semibold text-slate-600">Admin search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
