import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, XCircle, AlertTriangle, CheckCircle2, Search, RefreshCw, Settings,
  Minus, Plus, ChevronDown, ChevronUp, Save, Trash2, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/inventory")({
  component: InventoryPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Inventory — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type AccountType = "personal" | "shared" | "family" | "student" | "business" | "custom";

const ACCOUNT_TYPES: { id: AccountType; label: string; icon: string }[] = [
  { id: "personal", label: "Personal", icon: "👤" },
  { id: "shared", label: "Shared", icon: "👥" },
  { id: "family", label: "Family", icon: "👪" },
  { id: "student", label: "Student", icon: "🎓" },
  { id: "business", label: "Business", icon: "🛍️" },
  { id: "custom", label: "Custom", icon: "✨" },
];

type PlanRow = {
  label?: string;
  price?: number | string;
  original_price?: number;
  duration?: string;
  note?: string;
  period?: string;
  account_type?: string;
};

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
  account_types: AccountType[];
  stock_by_type: Record<string, number>;
  plans: PlanRow[];
  meta: Record<string, unknown>;
  custom_label?: string;
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
    const r = raw as {
      slug: string; name: string; emoji: string | null; gradient: string | null;
      image_url: string | null; plans: unknown; meta: Record<string, unknown> | null;
    };
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    const account_types = Array.isArray(meta.account_types)
      ? (meta.account_types as string[]).filter((x) => ACCOUNT_TYPES.some((a) => a.id === x)) as AccountType[]
      : [];
    const stock_by_type = (meta.stock_by_type && typeof meta.stock_by_type === "object")
      ? (meta.stock_by_type as Record<string, number>)
      : {};
    const hasByType = account_types.length > 0 && Object.keys(stock_by_type).length > 0;
    const totalByType = account_types.reduce((sum, t) => sum + (Number(stock_by_type[t]) || 0), 0);
    const hasFlatStock = typeof meta.stock === "number";
    const stock = hasByType ? totalByType : (hasFlatStock ? (meta.stock as number) : 0);
    const hasAny = hasByType || hasFlatStock;
    const lowAt = typeof meta.low_stock_at === "number" ? (meta.low_stock_at as number) : 5;
    const sold = typeof meta.sold_count === "number" ? (meta.sold_count as number) : 0;
    const plans = Array.isArray(r.plans) ? (r.plans as PlanRow[]) : [];
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
      status: statusOf(stock, lowAt, hasAny),
      account_types,
      stock_by_type,
      plans,
      meta,
      custom_label: typeof meta.custom_account_type_label === "string"
        ? meta.custom_account_type_label as string : undefined,
    };
  });
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
  const [expanded, setExpanded] = useState<string | null>(null);
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

  async function persist(row: Row, patch: Partial<{ meta: Record<string, unknown>; plans: PlanRow[] }>) {
    const { error } = await supabase.from("products").update(patch as never).eq("slug", row.slug);
    if (error) throw error;
  }

  async function bump(row: Row, delta: number) {
    if (row.account_types.length > 0) {
      toast.info(t("Manage per-type stock below", "নিচে প্রতিটি টাইপের স্টক আলাদা এডিট করুন"));
      setExpanded(row.slug);
      return;
    }
    const next = Math.max(0, row.stock + delta);
    qc.setQueryData<Row[]>(["admin-inventory"], (prev) =>
      (prev ?? []).map((r) =>
        r.slug === row.slug ? { ...r, stock: next, status: statusOf(next, r.low_at, true) } : r,
      ),
    );
    try {
      const { data } = await supabase.from("products").select("meta").eq("slug", row.slug).maybeSingle();
      const meta = ((data?.meta as Record<string, unknown>) || {});
      await persist(row, { meta: { ...meta, stock: next } });
    } catch {
      toast.error(t("Could not update stock", "স্টক আপডেট করা যায়নি"));
      refetch();
    }
  }

  async function setExact(row: Row, val: number) {
    if (row.account_types.length > 0) { setExpanded(row.slug); return; }
    const next = Math.max(0, Math.floor(val || 0));
    qc.setQueryData<Row[]>(["admin-inventory"], (prev) =>
      (prev ?? []).map((r) =>
        r.slug === row.slug ? { ...r, stock: next, status: statusOf(next, r.low_at, true) } : r,
      ),
    );
    try {
      const { data } = await supabase.from("products").select("meta").eq("slug", row.slug).maybeSingle();
      const meta = ((data?.meta as Record<string, unknown>) || {});
      await persist(row, { meta: { ...meta, stock: next } });
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
            {t("Stock & per-account-type price management", "স্টক ও প্রতি অ্যাকাউন্ট টাইপের প্রাইস ম্যানেজমেন্ট")}
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
          {filtered.map((row) => {
            const isOpen = expanded === row.slug;
            const hasTypes = row.account_types.length > 0;
            return (
              <li key={row.slug} className="hover:bg-slate-50/60">
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
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
                    <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                      {row.name}
                      {hasTypes && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
                          <Layers className="w-3 h-3" /> {row.account_types.length} {t("types", "টাইপ")}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-semibold tabular-nums">
                      {row.price != null ? `৳${row.price}` : "—"} · {row.sold} {t("sold", "সেল")}
                    </div>
                  </div>
                  <StatusPill status={row.status} t={t} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => bump(row, -1)}
                      disabled={hasTypes}
                      className="w-8 h-8 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      aria-label="decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={row.stock}
                      disabled={hasTypes}
                      onChange={(e) => setExact(row, Number(e.target.value))}
                      className="w-14 text-center rounded-md border border-slate-200 px-1 py-1 text-sm font-bold tabular-nums disabled:bg-slate-50 disabled:text-slate-500"
                    />
                    <button
                      onClick={() => bump(row, +1)}
                      disabled={hasTypes}
                      className="w-8 h-8 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      aria-label="increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.slug)}
                    className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {t("Manage", "ম্যানেজ")}
                  </button>
                </div>
                {isOpen && (
                  <ManagePanel
                    row={row}
                    onSaved={() => {
                      setExpanded(null);
                      refetch();
                    }}
                  />
                )}
              </li>
            );
          })}
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

function typeLabel(id: AccountType, customLabel?: string) {
  const base = ACCOUNT_TYPES.find((a) => a.id === id);
  if (id === "custom" && customLabel && customLabel.trim()) return { icon: "✨", label: customLabel };
  return base || { icon: "📦", label: id };
}

function ManagePanel({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const { t } = useAdminLang();
  const [types, setTypes] = useState<AccountType[]>(row.account_types);
  const [stockByType, setStockByType] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const t of ACCOUNT_TYPES) out[t.id] = Number(row.stock_by_type[t.id] ?? 0);
    return out;
  });
  const [plans, setPlans] = useState<PlanRow[]>(() => row.plans.map((p) => ({ ...p })));
  const [customLabel, setCustomLabel] = useState<string>(row.custom_label ?? "");
  const [busy, setBusy] = useState(false);

  function toggleType(id: AccountType) {
    setTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addPlan(forType: AccountType) {
    setPlans((prev) => [
      ...prev,
      { label: "1 Month", price: 0, duration: "1 month", account_type: forType, period: "1 Month" },
    ]);
  }

  function updatePlan(i: number, patch: Partial<PlanRow>) {
    setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function removePlan(i: number) {
    setPlans((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      // Rebuild stock_by_type only for selected types
      const nextStockByType: Record<string, number> = {};
      for (const id of types) nextStockByType[id] = Math.max(0, Number(stockByType[id]) || 0);

      // Filter plans: keep only plans whose account_type is selected, or is empty (global)
      const cleanPlans = plans
        .filter((p) => !p.account_type || types.includes(p.account_type as AccountType) || types.length === 0)
        .map((p) => ({
          ...p,
          price: typeof p.price === "string" ? Number(String(p.price).replace(/[^\d.]/g, "")) || 0 : (p.price ?? 0),
          period: p.period || p.duration || p.label || "",
          label: p.label || p.period || p.duration || "",
        }));

      const newMeta: Record<string, unknown> = {
        ...row.meta,
        account_types: types,
        account_type: types[0] ?? "none",
        stock_by_type: nextStockByType,
        custom_account_type_label: customLabel || undefined,
      };
      // Keep flat stock in sync (sum) so legacy consumers still work
      if (types.length > 0) {
        newMeta.stock = Object.values(nextStockByType).reduce((a, b) => a + (Number(b) || 0), 0);
      }

      const { error } = await supabase
        .from("products")
        .update({ meta: newMeta, plans: cleanPlans })
        .eq("slug", row.slug);
      if (error) throw error;
      toast.success(t("Saved", "সেভ হয়েছে"));
      onSaved();
    } catch (e) {
      toast.error(t("Save failed", "সেভ ব্যর্থ") + (e instanceof Error ? `: ${e.message}` : ""));
    } finally {
      setBusy(false);
    }
  }

  const showCustomLabel = types.includes("custom");

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-5 space-y-5">
      {/* Account types selector */}
      <div>
        <div className="text-xs font-black uppercase tracking-wide text-slate-600 mb-2">
          👤 {t("Account Types", "অ্যাকাউন্ট টাইপ")}
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPES.map((tp) => {
            const active = types.includes(tp.id);
            return (
              <button
                key={tp.id}
                onClick={() => toggleType(tp.id)}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border transition ${
                  active
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{tp.icon}</span> {tp.label}
              </button>
            );
          })}
        </div>
        {showCustomLabel && (
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={t("Custom type label (e.g. Premium, Gift)", "Custom টাইপের নাম")}
            className="mt-2 w-full h-9 px-3 rounded-lg border border-violet-200 bg-white text-sm outline-none focus:ring-2 focus:ring-violet-200"
          />
        )}
        <p className="text-[11px] text-slate-500 mt-2">
          {t(
            "Customer selects a type on the product page — only that type's prices show.",
            "কাস্টমার প্রোডাক্ট পেজে টাইপ সিলেক্ট করলে সেই টাইপের প্রাইসগুলোই দেখাবে।",
          )}
        </p>
      </div>

      {/* Per-type stock + plans */}
      {types.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500 font-semibold">
          {t(
            "Pick one or more account types above to configure stock and prices per type.",
            "উপরে থেকে এক বা একাধিক টাইপ সিলেক্ট করুন — প্রতিটির স্টক ও প্রাইস আলাদা সেট করা যাবে।",
          )}
        </div>
      )}

      {types.map((id) => {
        const info = typeLabel(id, customLabel);
        const typePlans = plans
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => p.account_type === id);
        return (
          <div key={id} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-lg">{info.icon}</span> {info.label}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-500">
                  {t("Stock", "স্টক")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockByType[id] ?? 0}
                  onChange={(e) =>
                    setStockByType((prev) => ({ ...prev, [id]: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm font-bold tabular-nums text-center"
                />
              </div>
            </div>

            <div className="space-y-2">
              {typePlans.length === 0 && (
                <div className="text-[11px] text-slate-400 italic">
                  {t("No prices yet — add a plan.", "এই টাইপের জন্য এখনো কোনো প্রাইস নেই।")}
                </div>
              )}
              {typePlans.map(({ p, idx }) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={p.label ?? p.period ?? ""}
                    onChange={(e) => updatePlan(idx, { label: e.target.value, period: e.target.value })}
                    placeholder={t("Duration (1 Month)", "মেয়াদ (1 Month)")}
                    className="col-span-5 sm:col-span-4 h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold"
                  />
                  <input
                    type="number"
                    min={0}
                    value={typeof p.price === "number" ? p.price : Number(p.price) || 0}
                    onChange={(e) => updatePlan(idx, { price: Number(e.target.value) || 0 })}
                    placeholder="৳ Price"
                    className="col-span-3 h-9 rounded-md border border-slate-200 px-2 text-xs font-bold tabular-nums"
                  />
                  <input
                    type="number"
                    min={0}
                    value={p.original_price ?? ""}
                    onChange={(e) =>
                      updatePlan(idx, { original_price: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder={t("Original", "কাটা দাম")}
                    className="col-span-3 h-9 rounded-md border border-slate-200 px-2 text-xs font-semibold tabular-nums"
                  />
                  <button
                    onClick={() => removePlan(idx)}
                    className="col-span-1 h-9 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 grid place-items-center"
                    aria-label="delete plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addPlan(id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 text-xs font-bold hover:bg-violet-100"
              >
                <Plus className="w-3.5 h-3.5" /> {t("Add price plan", "প্রাইস প্ল্যান যোগ করুন")}
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onSaved}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          {t("Close", "বন্ধ")}
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {busy ? t("Saving...", "সেভ হচ্ছে...") : t("Save changes", "সেভ করুন")}
        </button>
      </div>
    </div>
  );
}
