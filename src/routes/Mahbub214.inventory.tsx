import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, XCircle, AlertTriangle, CheckCircle2, Search, RefreshCw, Settings, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/inventory")({
  component: InventoryPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Inventory — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Row = {
  slug: string;
  name: string;
  image_url: string | null;
  emoji: string | null;
  gradient: string | null;
  stock: number;
  low_at: number;
  sold: number;
  price: number | null;
  status: "out" | "low" | "ok" | "unknown";
};

type ProductRecord = {
  slug: string;
  name: string;
  emoji: string | null;
  gradient: string | null;
  image_url: string | null;
  plans: unknown;
  meta: Record<string, unknown> | null;
};

function statusOf(stock: number, lowAt: number, hasStockMeta: boolean): Row["status"] {
  if (!hasStockMeta) return "unknown";
  if (stock <= 0) return "out";
  if (stock <= lowAt) return "low";
  return "ok";
}

function firstPrice(plans: unknown): number | null {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  const raw = (plans[0] as { price?: unknown })?.price;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchInventory(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("products")
    .select("slug,name,emoji,gradient,image_url,plans,meta")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((raw): Row => {
    const r = raw as unknown as ProductRecord;
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    const hasStock = typeof meta.stock === "number";
    const stock = hasStock ? (meta.stock as number) : 0;
    const lowAt = typeof meta.low_stock_at === "number" ? (meta.low_stock_at as number) : 5;
    const sold = typeof meta.sold_count === "number" ? (meta.sold_count as number) : 0;
    return {
      slug: r.slug,
      name: r.name,
      image_url: r.image_url,
      emoji: r.emoji,
      gradient: r.gradient,
      stock,
      low_at: lowAt,
      sold,
      price: firstPrice(r.plans),
      status: statusOf(stock, lowAt, hasStock),
    };
  });
}

async function updateStock(slug: string, nextStock: number, meta: Record<string, unknown>) {
  const newMeta = { ...meta, stock: Math.max(0, nextStock) };
  const { error } = await supabase.from("products").update({ meta: newMeta }).eq("slug", slug);
  if (error) throw error;
}

function StatCard({ tone, icon, value, label }: { tone: string; icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="admin-card rounded-2xl bg-white p-5 border border-slate-100">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>{icon}</div>
      <div className="mt-4 text-3xl font-black text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
    </div>
  );
}

type FilterKey = "all" | "out" | "low" | "ok";

function InventoryPage() {
  const { t } = useAdminLang();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [defaultLow, setDefaultLow] = useState<number>(() => {
    if (typeof localStorage === "undefined") return 5;
    return Number(localStorage.getItem("anbd:invLowAt") || 5) || 5;
  });

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: fetchInventory,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const s = { total: rows.length, out: 0, low: 0, ok: 0 };
    for (const r of rows) {
      if (r.status === "out") s.out++;
      else if (r.status === "low") s.low++;
      else if (r.status === "ok") s.ok++;
    }
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  async function bump(row: Row, delta: number) {
    const next = Math.max(0, row.stock + delta);
    // optimistic
    qc.setQueryData<Row[]>(["admin-inventory"], (prev) =>
      (prev ?? []).map((r) =>
        r.slug === row.slug ? { ...r, stock: next, status: statusOf(next, r.low_at, true) } : r,
      ),
    );
    try {
      // read latest meta then merge
      const { data } = await supabase.from("products").select("meta").eq("slug", row.slug).maybeSingle();
      const meta = ((data?.meta as Record<string, unknown>) || {});
      await updateStock(row.slug, next, meta);
    } catch (e) {
      toast.error(t("Could not update stock", "স্টক আপডেট করা যায়নি"));
      refetch();
    }
  }

  async function setExact(row: Row, val: number) {
    const next = Math.max(0, Math.floor(val || 0));
    qc.setQueryData<Row[]>(["admin-inventory"], (prev) =>
      (prev ?? []).map((r) =>
        r.slug === row.slug ? { ...r, stock: next, status: statusOf(next, r.low_at, true) } : r,
      ),
    );
    try {
      const { data } = await supabase.from("products").select("meta").eq("slug", row.slug).maybeSingle();
      const meta = ((data?.meta as Record<string, unknown>) || {});
      await updateStock(row.slug, next, meta);
    } catch {
      toast.error(t("Could not update stock", "স্টক আপডেট করা যায়নি"));
      refetch();
    }
  }

  const chips: { key: FilterKey; label: string; dot: string }[] = [
    { key: "all", label: t("All", "সব"), dot: "" },
    { key: "out", label: t("Out", "আউট"), dot: "bg-rose-500" },
    { key: "low", label: t("Low", "কম"), dot: "bg-amber-400" },
    { key: "ok", label: t("Sufficient", "পর্যাপ্ত"), dot: "bg-violet-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {t("Inventory Alerts", "Inventory Alerts")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">
            {t("Stock monitoring & alert system", "স্টক মনিটরিং ও অ্যালার্ট সিস্টেম")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            {t("Settings", "সেটিংস")}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="admin-card rounded-2xl bg-white p-4 border border-slate-100 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-slate-700">
            {t("Default low-stock threshold", "ডিফল্ট লো-স্টক থ্রেশহোল্ড")}:
          </span>
          <input
            type="number"
            min={0}
            value={defaultLow}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value) || 0);
              setDefaultLow(v);
              try { localStorage.setItem("anbd:invLowAt", String(v)); } catch { /* ignore */ }
            }}
            className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold"
          />
          <span className="text-xs text-slate-500">
            {t("Products with stock at or below this are marked Low.", "এর সমান বা কম স্টকযুক্ত প্রোডাক্ট লো হিসেবে দেখাবে।")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard tone="bg-violet-100 text-violet-600" icon={<Package className="w-5 h-5" />} value={stats.total} label={t("Total Products", "মোট প্রোডাক্ট")} />
        <StatCard tone="bg-rose-100 text-rose-600" icon={<XCircle className="w-5 h-5" />} value={stats.out} label={t("Out of Stock", "স্টক আউট")} />
        <StatCard tone="bg-amber-100 text-amber-600" icon={<AlertTriangle className="w-5 h-5" />} value={stats.low} label={t("Low Stock", "স্টক কম")} />
        <StatCard tone="bg-violet-100 text-violet-600" icon={<CheckCircle2 className="w-5 h-5" />} value={stats.ok} label={t("Sufficient Stock", "পর্যাপ্ত স্টক")} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search products...", "প্রোডাক্ট সার্চ...")}
            className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border transition ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {c.dot && <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="admin-card rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {t("Inventory List", "ইনভেন্টরি তালিকা")} ({filtered.length})
          </h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-500 font-semibold">
              {t("No products match this filter.", "কোনো প্রোডাক্ট পাওয়া যায়নি।")}
            </li>
          )}
          {filtered.map((row) => (
            <li key={row.slug} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/60">
              <div
                className={`shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br ${row.gradient || "from-violet-200 to-fuchsia-200"} grid place-items-center text-lg`}
              >
                {row.image_url ? (
                  <img src={row.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span>{row.emoji || "📦"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-semibold tabular-nums">
                  {row.price != null ? `৳${row.price}` : "—"} · {row.sold} {t("sold", "সেল")}
                </div>
              </div>
              <StatusPill status={row.status} t={t} />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => bump(row, -1)}
                  className="w-8 h-8 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100"
                  aria-label="decrease"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={row.stock}
                  onChange={(e) => setExact(row, Number(e.target.value))}
                  className="w-14 text-center rounded-md border border-slate-200 px-1 py-1 text-sm font-bold tabular-nums"
                />
                <button
                  onClick={() => bump(row, +1)}
                  className="w-8 h-8 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100"
                  aria-label="increase"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusPill({ status, t }: { status: Row["status"]; t: (en: string, bn?: string) => string }) {
  const map: Record<Row["status"], { label: string; cls: string; dot: string }> = {
    out: { label: t("Out", "আউট"), cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
    low: { label: t("Low", "কম"), cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
    ok: { label: t("Sufficient", "পর্যাপ্ত"), cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    unknown: { label: t("Unknown", "অজানা"), cls: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  };
  const s = map[status];
  return (
    <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
