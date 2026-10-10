import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Users, TrendingUp, TrendingDown, ArrowUpRight,
  Bell, ShoppingCart, Clock, CreditCard, CheckCircle2, XCircle, UsersRound,
  DollarSign, Calendar, BarChart3, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/")({
  component: AdminDashboard,
});

type OrderRow = {
  id: string; created_at: string; status: string; total: number;
  full_name: string; email: string; payment_method: string; items: unknown;
};
type ProductRow = {
  slug: string; name: string; emoji: string; image_url: string;
  category: string; is_active: boolean; created_at: string;
};

const fmtBDT = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");

type Period = "daily" | "weekly" | "monthly";

const DASH_CACHE_KEY = "anbd:adminDashCache";
const DASH_CACHE_TTL = 60_000; // 1 minute

type DashCache = {
  ts: number;
  orders: OrderRow[];
  products: ProductRow[];
  counts: { products: number; orders: number; users: number };
};

function readDashCache(): DashCache | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DASH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashCache;
    return parsed;
  } catch { return null; }
}

function AdminDashboard() {
  const { t, lang } = useAdminLang();
  const cached = useMemo(() => readDashCache(), []);
  const [orders, setOrders] = useState<OrderRow[]>(cached?.orders ?? []);
  const [products, setProducts] = useState<ProductRow[]>(cached?.products ?? []);
  const [counts, setCounts] = useState(cached?.counts ?? { products: 0, orders: 0, users: 0 });
  const [loading, setLoading] = useState(!cached);
  const [period, setPeriod] = useState<Period>("daily");

  useEffect(() => {
    // Skip refetch if cache is fresh (< TTL)
    if (cached && Date.now() - cached.ts < DASH_CACHE_TTL) return;
    let cancelled = false;
    (async () => {
      try {
        const { getDashboardStats } = await import("@/lib/dashboard.functions");
        const data = await getDashboardStats();
        if (cancelled) return;

        setCounts(data.counts);
        setOrders(data.recentOrders as OrderRow[]);
        setProducts(data.recentProducts as ProductRow[]);
        setLoading(false);

        try {
          sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            orders: data.recentOrders,
            products: data.recentProducts,
            counts: data.counts,
          } as DashCache));
        } catch { /* ignore quota */ }
      } catch (err) {
        console.error("Dashboard load failed", err);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cached]);

  // ----- Aggregate stats -----
  const stats = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const lastMonthStart = new Date(monthStart); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const yearStart = new Date(); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let revenue = 0, todayRev = 0, monthRev = 0, yearRev = 0, lastMonthRev = 0;
    let totalOrders = 0, pending = 0, paymentPending = 0, delivered = 0, cancelled = 0;
    let newOrders24h = 0;

    orders.forEach((o) => {
      const total = Number(o.total) || 0;
      const d = new Date(o.created_at);
      const live = o.status !== "cancelled";
      const k = (o.status || "").toLowerCase();

      if (live) revenue += total;
      if (live && d >= start) todayRev += total;
      if (live && d >= monthStart) monthRev += total;
      if (live && d >= lastMonthStart && d < monthStart) lastMonthRev += total;
      if (live && d >= yearStart) yearRev += total;

      totalOrders++;
      if (k === "pending") pending++;
      if (k === "processing" || k === "payment_pending" || k === "awaiting_payment") paymentPending++;
      if (k === "completed" || k === "paid" || k === "delivered") delivered++;
      if (k === "cancelled" || k === "failed") cancelled++;
      if (d >= last24h) newOrders24h++;
    });

    const monthDelta = lastMonthRev > 0
      ? Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100)
      : (monthRev > 0 ? 100 : 0);

    return {
      revenue, todayRev, monthRev, yearRev,
      totalOrders, pending, paymentPending, delivered, cancelled,
      newOrders24h, monthDelta,
    };
  }, [orders]);

  // ----- Sales chart series -----
  const chart = useMemo(() => {
    const buckets: { label: string; v: number }[] = [];
    const fmt = (d: Date, kind: Period) => {
      if (kind === "daily") return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" });
      if (kind === "weekly") return `W${Math.ceil(d.getDate() / 7)}`;
      return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en", { month: "short" });
    };
    const now = new Date();
    if (period === "daily") {
      for (let i = 13; i >= 0; i--) {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i);
        const next = new Date(day); next.setDate(day.getDate() + 1);
        let v = 0;
        orders.forEach((o) => {
          const dd = new Date(o.created_at);
          if (dd >= day && dd < next && o.status !== "cancelled") v += Number(o.total) || 0;
        });
        buckets.push({ label: fmt(day, "daily"), v });
      }
    } else if (period === "weekly") {
      for (let i = 7; i >= 0; i--) {
        const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
        const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
        let v = 0;
        orders.forEach((o) => {
          const dd = new Date(o.created_at);
          if (dd >= start && dd <= end && o.status !== "cancelled") v += Number(o.total) || 0;
        });
        buckets.push({ label: start.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" }), v });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        let v = 0;
        orders.forEach((o) => {
          const dd = new Date(o.created_at);
          if (dd >= m && dd < next && o.status !== "cancelled") v += Number(o.total) || 0;
        });
        buckets.push({ label: fmt(m, "monthly"), v });
      }
    }
    return buckets;
  }, [orders, period, lang]);

  const chartMax = Math.max(1, ...chart.map((s) => s.v));

  // ----- Top selling products -----
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; image: string; emoji: string; sold: number; revenue: number }>();
    orders.forEach((o) => {
      if (!Array.isArray(o.items)) return;
      (o.items as any[]).forEach((it) => {
        const key = it.slug || it.name;
        if (!key) return;
        const cur = map.get(key) ?? { name: it.name ?? key, image: it.image_url ?? "", emoji: it.emoji ?? "📦", sold: 0, revenue: 0 };
        cur.sold += Number(it.qty ?? it.quantity ?? 1);
        cur.revenue += Number(it.price ?? 0) * Number(it.qty ?? it.quantity ?? 1);
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.sold - a.sold).slice(0, 5);
  }, [orders]);

  // ----- KPI cards -----
  type Kpi = {
    label: string; value: string; Icon: any;
    iconGrad: string; bgGrad: string; accent?: string;
    delta?: number; sub?: string;
  };

  const revenueKpis: Kpi[] = [
    {
      label: t("TODAY'S SALES", "আজকের সেল"),
      value: fmtBDT(stats.todayRev),
      Icon: TrendingUp,
      iconGrad: "from-violet-600 to-indigo-700",
      bgGrad: "from-violet-50/50 via-white to-white",
      accent: "#7c3aed",
    },
    {
      label: t("THIS MONTH REVENUE", "এই মাসের আয়"),
      value: fmtBDT(stats.monthRev),
      Icon: DollarSign,
      iconGrad: "from-violet-600 to-fuchsia-700",
      bgGrad: "from-violet-50/50 via-white to-white",
      accent: "#22d3ee",
      delta: stats.monthDelta,
      sub: t("vs last month", "গত মাসের তুলনায়"),
    },
    {
      label: t("THIS YEAR REVENUE", "এই বছরের আয়"),
      value: fmtBDT(stats.yearRev),
      Icon: BarChart3,
      iconGrad: "from-emerald-500 to-teal-600",
      bgGrad: "from-emerald-50/50 via-white to-white",
      accent: "#f9a8d4",
    },
    {
      label: t("TOTAL REVENUE (ALL)", "মোট আয় (সব)"),
      value: fmtBDT(stats.revenue),
      Icon: Wallet,
      iconGrad: "from-orange-500 to-amber-600",
      bgGrad: "from-orange-50/50 via-white to-white",
      accent: "#fbbf24",
    },
  ];

  const statusKpis: Kpi[] = [
    {
      label: t("TOTAL ORDERS", "মোট অর্ডার"),
      value: counts.orders.toLocaleString("en-IN"),
      Icon: ShoppingCart,
      iconGrad: "from-violet-600 to-indigo-700",
      bgGrad: "from-violet-50/50 via-white to-white",
      accent: "#8b5cf6",
      delta: stats.totalOrders > 0 ? Math.round((stats.delivered / stats.totalOrders) * 100) : 0,
      sub: t("delivered", "সম্পন্ন"),
    },
    {
      label: t("PENDING", "অপেক্ষমাণ"),
      value: stats.pending.toString(),
      Icon: Clock,
      iconGrad: "from-amber-500 to-yellow-600",
      bgGrad: "from-amber-50/50 via-white to-white",
      accent: "#22d3ee",
    },
    {
      label: t("PAYMENT PENDING", "পেমেন্ট অপেক্ষমাণ"),
      value: stats.paymentPending.toString(),
      Icon: CreditCard,
      iconGrad: "from-rose-600 to-red-700",
      bgGrad: "from-rose-50/50 via-white to-white",
      accent: "#f9a8d4",
    },
    {
      label: t("DELIVERED", "ডেলিভারড"),
      value: stats.delivered.toString(),
      Icon: CheckCircle2,
      iconGrad: "from-emerald-500 to-teal-600",
      bgGrad: "from-emerald-50/50 via-white to-white",
      accent: "#fbbf24",
    },
    {
      label: t("CANCELLED", "বাতিল"),
      value: stats.cancelled.toString(),
      Icon: XCircle,
      iconGrad: "from-rose-600 to-red-700",
      bgGrad: "from-rose-50/50 via-white to-white",
      accent: "#8b5cf6",
    },
    {
      label: t("CUSTOMERS", "কাস্টমার"),
      value: counts.users.toLocaleString("en-IN"),
      Icon: UsersRound,
      iconGrad: "from-sky-500 to-blue-600",
      bgGrad: "from-sky-50/50 via-white to-white",
      accent: "#22d3ee",
    },
  ];

  return (
    <div className="admin-dashboard space-y-6 pb-10 min-w-0">
      {/* Notifications banner */}
      {stats.newOrders24h > 0 && (
        <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <Bell className="w-4 h-4 text-slate-700" />
            <h2 className="text-[15px] font-bold text-slate-900">{t("Notifications", "নোটিফিকেশন")}</h2>
            <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold grid place-items-center">
              {stats.newOrders24h}
            </span>
          </div>
          <Link
            to="/Mahbub214/orders"
            className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-pink-50 ring-1 ring-blue-100 px-3.5 py-3 hover:from-blue-100 hover:to-pink-100 transition"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-100 grid place-items-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-blue-700" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-slate-900 truncate">
                {stats.newOrders24h} {t("new order(s) in the last 24 hours", "নতুন অর্ডার গত ২৪ ঘণ্টায়")}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">{t("Today", "আজ")}</div>
            </div>
          </Link>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-white/60 shadow-sm p-6 sm:p-8 flex items-center gap-6">
        <div className="absolute right-0 top-0 opacity-10 mix-blend-multiply pointer-events-none w-full h-full" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4=')" }} />
        
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_8px_16px_-6px_rgba(99,102,241,0.5)] grid place-items-center text-white relative z-10">
          <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            Dashboard
          </h1>
          <p className="text-[13px] font-semibold text-slate-500">
            Overview • Manage and configure dashboard
          </p>
        </div>
      </div>

      {/* Snapshot Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-2">
        <div className="text-[13px] font-semibold text-slate-500">
          Real-time business snapshot - <span className="text-slate-900 font-bold">{new Date().toLocaleTimeString()}</span>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <TrendingUp className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* REVENUE OVERVIEW */}
      <section>
        <SectionHeader title={t("REVENUE OVERVIEW", "আয়ের পর্যালোচনা")} />
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {revenueKpis.map((k) => (
            <KpiCard key={k.label} kpi={k} loading={loading} />
          ))}
        </div>
      </section>

      {/* ORDER STATUS */}
      <section>
        <SectionHeader title={t("ORDER STATUS", "অর্ডার স্ট্যাটাস")} />
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
          {statusKpis.map((k) => (
            <KpiCard key={k.label} kpi={k} loading={loading} compact />
          ))}
        </div>
      </section>

      {/* Sales Overview + Best Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
          <div className="lg:col-span-2 admin-card rounded-[24px] bg-white border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_30px_-12px_rgba(15,23,42,0.08)] p-5 sm:p-7 min-w-0 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
            <div className="min-w-0">
              <h3 className="text-[18px] font-extrabold text-slate-900">{t("Sales Overview", "সেল ওভারভিউ")}</h3>
              {stats.monthDelta !== 0 && (
                <div className={`mt-1 text-[12px] font-semibold inline-flex items-center gap-1 ${stats.monthDelta >= 0 ? "text-blue-600" : "text-rose-600"}`}>
                  {stats.monthDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(stats.monthDelta)}% {t("revenue growth vs last month", "আয় বেড়েছে গত মাসের তুলনায়")}
                </div>
              )}
            </div>
            <div className="shrink-0 inline-flex w-full sm:w-auto rounded-full bg-slate-100 p-1 text-[11.5px] font-bold ring-1 ring-slate-200 overflow-x-auto">
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-full transition shrink-0 flex-1 sm:flex-none ${period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t(p[0].toUpperCase() + p.slice(1), p === "daily" ? "দৈনিক" : p === "weekly" ? "সাপ্তাহিক" : "মাসিক")}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const W = 700, H = 220;
            const step = W / Math.max(1, chart.length - 1);
            const pts = chart.map((s, i) => [i * step, H - (s.v / chartMax) * (H - 40) - 10] as [number, number]);
            if (pts.length === 0) return null;
            let d = `M ${pts[0][0]},${pts[0][1]}`;
            for (let i = 1; i < pts.length; i++) {
              const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
              const cx = (x1 + x2) / 2;
              d += ` C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
            }
            const area = `${d} L ${W},${H} L 0,${H} Z`;
            const labelEvery = Math.ceil(chart.length / 7);
            return (
              <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full h-56 mt-4">
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grid */}
                {[0.25, 0.5, 0.75].map((p, i) => (
                  <line key={i} x1="0" x2={W} y1={H - p * (H - 20) - 10} y2={H - p * (H - 20) - 10}
                    stroke="#e2e8f0" strokeDasharray="3 4" strokeWidth="1" />
                ))}
                <path d={area} fill="url(#salesGrad)" />
                <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
                ))}
                {chart.map((s, i) => (
                  (i % labelEvery === 0 || i === chart.length - 1) && (
                    <text key={i} x={i * step} y={H + 22} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10.5, fontWeight: 600 }}>
                      {s.label}
                    </text>
                  )
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Best Selling Products */}
        <div className="admin-card rounded-[24px] bg-white border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_30px_-12px_rgba(15,23,42,0.08)] p-5 sm:p-7">
          <div className="flex items-start gap-2 mb-4">
            <span className="w-1.5 h-6 rounded-full bg-violet-600 mt-1" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="text-[18px] font-extrabold text-slate-900">{t("Best Selling Products", "বেস্ট সেলিং প্রোডাক্ট")}</h3>
            </div>
            <Link to="/Mahbub214/products" className="shrink-0 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5">
              {t("All", "সব")} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-12">{t("No sales yet", "এখনও কোনো সেল নেই")}</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name + i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-1.5">
                  <span className="w-7 text-[12px] font-black text-slate-500 tabular-nums">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] font-semibold text-slate-500 tabular-nums">{p.sold} {t("sold", "বিক্রি")}</div>
                  </div>
                  <div className="text-[12px] font-bold text-slate-900 tabular-nums shrink-0">{fmtBDT(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Conversion Stats */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-start gap-2 mb-3">
              <span className="w-1.5 h-6 rounded-full bg-violet-600 mt-0.5" aria-hidden />
              <h4 className="text-[15px] font-extrabold text-slate-900">{t("Conversion Stats", "কনভার্শন স্ট্যাটস")}</h4>
            </div>
            <div className="space-y-2.5">
              <ConvRow label={t("Total Orders", "মোট অর্ডার")} value={counts.orders.toLocaleString("en-IN")} Icon={ShoppingCart} color="violet" />
              <ConvRow label={t("Delivered", "ডেলিভারড")} value={stats.delivered.toString()} Icon={CheckCircle2} color="emerald" />
              <ConvRow label={t("Conversion Rate", "কনভার্শন রেট")} value={`${counts.orders > 0 ? Math.round((stats.delivered / counts.orders) * 100) : 0}%`} Icon={TrendingUp} color="sky" />
              <ConvRow label={t("Customers", "কাস্টমার")} value={counts.users.toLocaleString("en-IN")} Icon={UsersRound} color="orange" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-1.5 h-8 rounded-full bg-violet-600" aria-hidden />
      <h2 className="text-[20px] sm:text-[22px] font-extrabold text-slate-900 tracking-tight uppercase">
        {title}
      </h2>
    </div>
  );
}

function KpiCard({ kpi, loading, compact }: { kpi: any; loading: boolean; compact?: boolean }) {
  const { Icon } = kpi;
  // Convert iconGrad to a subtle background gradient for the whole card
  const bgColors: Record<string, string> = {
    "#7c3aed": "from-violet-50 via-white to-white",
    "#22d3ee": "from-cyan-50 via-white to-white",
    "#f9a8d4": "from-pink-50 via-white to-white",
    "#fbbf24": "from-amber-50 via-white to-white",
    "#8b5cf6": "from-purple-50 via-white to-white",
  };
  const cardBg = bgColors[kpi.accent] || "from-slate-50 via-white to-white";

  return (
    <div
      className={`admin-kpi-card relative overflow-hidden rounded-[24px] border border-slate-100 shadow-sm ${compact ? "p-5" : "p-6"} transition-all bg-gradient-to-br ${cardBg}`}
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span className={`admin-kpi-icon w-10 h-10 rounded-full bg-gradient-to-br ${kpi.iconGrad} grid place-items-center text-white shrink-0 shadow-md`}>
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </span>
          {typeof kpi.delta === "number" && kpi.delta !== 0 && (
            <span className={`shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold shadow-sm ${kpi.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {kpi.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.delta)}%
            </span>
          )}
        </div>
        <div className={`${compact ? "mt-5" : "mt-6"} text-[10px] font-extrabold text-slate-500 tracking-[0.1em] uppercase truncate`}>
          {kpi.label}
        </div>
        <div className={`mt-0.5 ${compact ? "text-[20px]" : "text-[24px] sm:text-[28px]"} font-black text-slate-900 tracking-tight tabular-nums truncate`} style={{ fontFamily: "var(--font-heading)" }}>
          {loading ? <span className="inline-block w-20 h-7 bg-slate-100 rounded animate-pulse" /> : kpi.value}
        </div>
        {kpi.sub && !loading && (
          <div className="mt-1 text-[11px] font-semibold text-slate-400 truncate">{kpi.sub}</div>
        )}
      </div>
    </div>
  );
}

function ConvRow({ label, value, Icon, color }: { label: string; value: string; Icon: any; color: "violet" | "emerald" | "sky" | "orange" }) {
  const map = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    orange: "bg-orange-50 text-orange-600",
  } as const;
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 h-8 rounded-lg grid place-items-center ${map[color]} shrink-0`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1 text-[12.5px] font-semibold text-slate-700 truncate">{label}</div>
      <div className="text-[13px] font-bold text-slate-900 tabular-nums shrink-0">{value}</div>
    </div>
  );
}
