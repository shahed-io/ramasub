import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Users, TrendingUp, TrendingDown, ArrowUpRight,
  Bell, ShoppingCart, Clock, CreditCard, CheckCircle2, XCircle, UsersRound,
  DollarSign, Calendar, BarChart3, Wallet, LayoutDashboard, LayoutGrid, RefreshCw,
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
    iconGrad: string; bgGrad: string; borderColor: string;
    delta?: number; sub?: string;
  };

  const revenueKpis: Kpi[] = [
    {
      label: t("TODAY'S SALES", "আজকের সেল"),
      value: fmtBDT(stats.todayRev),
      Icon: TrendingUp,
      iconGrad: "from-violet-600 to-indigo-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("THIS MONTH REVENUE", "এই মাসের আয়"),
      value: fmtBDT(stats.monthRev),
      Icon: DollarSign,
      iconGrad: "from-violet-500 to-purple-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
      delta: stats.monthDelta,
      sub: t("vs last month", "গত মাসের তুলনায়"),
    },
    {
      label: t("THIS YEAR REVENUE", "এই বছরের আয়"),
      value: fmtBDT(stats.yearRev),
      Icon: TrendingUp,
      iconGrad: "from-emerald-500 to-teal-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("TOTAL REVENUE (ALL)", "মোট আয় (সব)"),
      value: fmtBDT(stats.revenue),
      Icon: Wallet,
      iconGrad: "from-amber-500 to-orange-500",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
  ];

  const statusKpis: Kpi[] = [
    {
      label: t("TOTAL ORDERS", "মোট অর্ডার"),
      value: counts.orders.toLocaleString("en-IN"),
      Icon: ShoppingCart,
      iconGrad: "from-violet-600 to-indigo-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
      delta: stats.totalOrders > 0 ? Math.round((stats.delivered / stats.totalOrders) * 100) : 0,
      sub: t("delivered", "সম্পন্ন"),
    },
    {
      label: t("PENDING", "অপেক্ষমাণ"),
      value: stats.pending.toString(),
      Icon: Clock,
      iconGrad: "from-amber-500 to-yellow-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("PAYMENT PENDING", "পেমেন্ট অপেক্ষমাণ"),
      value: stats.paymentPending.toString(),
      Icon: CreditCard,
      iconGrad: "from-orange-500 to-red-500",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("DELIVERED", "ডেলিভারড"),
      value: stats.delivered.toString(),
      Icon: CheckCircle2,
      iconGrad: "from-emerald-500 to-teal-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("CANCELLED", "বাতিল"),
      value: stats.cancelled.toString(),
      Icon: XCircle,
      iconGrad: "from-rose-500 to-red-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
    {
      label: t("CUSTOMERS", "কাস্টমার"),
      value: counts.users.toLocaleString("en-IN"),
      Icon: UsersRound,
      iconGrad: "from-sky-500 to-blue-600",
      bgGrad: "#ffffff",
      borderColor: "#E4E7EF",
    },
  ];

  return (
    <div className="admin-dashboard space-y-6 pb-10 min-w-0">
      {/* Notifications banner */}
      {stats.newOrders24h > 0 && (
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "#ffffff",
            border: "1px solid #E4E7EF",
            boxShadow: "0 4px 20px rgba(109,74,255,0.06), 0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Bell className="w-4 h-4" style={{ color: "#6D4AFF" }} />
            <h2 className="text-[15px] font-bold" style={{ color: "#15192C" }}>{t("Notifications", "নোটিফিকেশন")}</h2>
            <span
              className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center text-white"
              style={{ background: "linear-gradient(135deg, #6D4AFF, #4f46e5)" }}
            >
              {stats.newOrders24h}
            </span>
          </div>
          <Link
            to="/Mahbub214/orders"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition hover:opacity-90"
            style={{
              background: "#EEE9FF",
              border: "1px solid rgba(109,74,255,0.15)",
            }}
          >
            <span
              className="w-9 h-9 rounded-xl grid place-items-center shrink-0 text-white"
              style={{ background: "linear-gradient(135deg, #6D4AFF, #4f46e5)", boxShadow: "0 4px 12px -2px rgba(109,74,255,0.4)" }}
            >
              <ShoppingCart className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold truncate" style={{ color: "#15192C" }}>
                {stats.newOrders24h} {t("new order(s) in the last 24 hours", "নতুন অর্ডার গত ২৪ ঘণ্টায়")}
              </div>
              <div className="text-[11px] mt-0.5 uppercase tracking-wider font-bold" style={{ color: "#6D4AFF" }}>{t("Today", "আজ")}</div>
            </div>
          </Link>
        </div>
      )}

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 min-w-0"
        style={{
          background: "#ffffff",
          border: "1px solid #E4E7EF",
          boxShadow: "0 4px 24px rgba(109,74,255,0.06), 0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Top purple accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, #6D4AFF, #4f46e5, #818cf8)" }}
        />
        {/* Decorative blobs */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-25"
          style={{ background: "#6D4AFF" }}
        />
        <svg aria-hidden className="pointer-events-none absolute right-20 sm:right-40 top-1/2 -translate-y-1/2 w-64 h-28 opacity-20" viewBox="0 0 200 60" fill="none">
          <path d="M0 45 Q 30 10, 60 35 T 120 20 T 170 38 T 200 15" stroke="#6D4AFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0 52 Q 35 30, 70 48 T 130 35 T 180 42 T 200 28" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>
        <LayoutGrid aria-hidden className="pointer-events-none absolute -right-6 -bottom-6 w-36 h-36 opacity-5 stroke-[1.2]" style={{ color: "#6D4AFF" }} />

        <div className="relative flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center text-white"
              style={{
                background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)",
                boxShadow: "0 8px 24px -4px rgba(109,74,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <LayoutDashboard className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-heading)", color: "#15192C" }}
              >
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm font-medium mt-1 leading-snug" style={{ color: "#667085" }}>
                Overview • Real-time business snapshot
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time sub-bar */}
      <div className="flex items-center justify-between text-xs font-medium px-1 pt-1" style={{ color: "#667085" }}>
        <div className="flex items-center gap-2">
          <span>{t("Real-time business snapshot", "রিয়েল-টাইম বিজনেস স্ন্যাপশট")}</span>
          <span style={{ color: "#E4E7EF" }}>•</span>
          <span className="font-semibold" style={{ color: "#15192C" }}>{new Date().toLocaleTimeString()}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80"
          style={{ background: "#EEE9FF", border: "1px solid rgba(109,74,255,0.18)", color: "#6D4AFF" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t("Refresh", "রিফ্রেশ")}</span>
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
          <div
            className="lg:col-span-2 rounded-2xl p-5 sm:p-7 min-w-0 overflow-hidden"
            style={{
              background: "#ffffff",
              border: "1px solid #E4E7EF",
              boxShadow: "0 4px 20px rgba(109,74,255,0.05), 0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
            <div className="min-w-0">
              <h3 className="text-[18px] font-extrabold" style={{ color: "#15192C" }}>{t("Sales Overview", "সেল ওভারভিউ")}</h3>
              {stats.monthDelta !== 0 && (
                <div
                  className="mt-1 text-[12px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    color: stats.monthDelta >= 0 ? "#15803D" : "#DC2626",
                    background: stats.monthDelta >= 0 ? "rgba(21,128,61,0.08)" : "rgba(220,38,38,0.08)",
                  }}
                >
                  {stats.monthDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(stats.monthDelta)}% {t("revenue growth vs last month", "আয় বেড়েছে গত মাসের তুলনায়")}
                </div>
              )}
            </div>
            <div
              className="shrink-0 inline-flex w-full sm:w-auto rounded-xl p-1 text-[11.5px] font-bold overflow-x-auto"
              style={{ background: "#F6F7FB", border: "1px solid #E4E7EF" }}
            >
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1 rounded-lg transition shrink-0 flex-1 sm:flex-none"
                  style={period === p ? {
                    background: "#6D4AFF",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(109,74,255,0.3)",
                  } : { color: "#667085" }}
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
                    <stop offset="0%" stopColor="#6D4AFF" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#6D4AFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grid */}
                {[0.25, 0.5, 0.75].map((p, i) => (
                  <line key={i} x1="0" x2={W} y1={H - p * (H - 20) - 10} y2={H - p * (H - 20) - 10}
                    stroke="#E4E7EF" strokeDasharray="3 4" strokeWidth="1" />
                ))}
                <path d={area} fill="url(#salesGrad)" />
                <path d={d} fill="none" stroke="#6D4AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="#6D4AFF" strokeWidth="2.5" />
                ))}
                {chart.map((s, i) => (
                  (i % labelEvery === 0 || i === chart.length - 1) && (
                    <text key={i} x={i * step} y={H + 22} textAnchor="middle" fill="#667085" style={{ fontSize: 10.5, fontWeight: 600 }}>
                      {s.label}
                    </text>
                  )
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Best Selling Products */}
        <div
          className="rounded-2xl p-5 sm:p-7"
          style={{
            background: "#ffffff",
            border: "1px solid #E4E7EF",
            boxShadow: "0 4px 20px rgba(109,74,255,0.05), 0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: "linear-gradient(to bottom, #6D4AFF, #4f46e5)" }} />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-extrabold tracking-wider uppercase" style={{ color: "#15192C" }}>{t("Best Selling Products", "বেস্ট সেলিং প্রোডাক্ট")}</h3>
            </div>
            <Link
              to="/Mahbub214/products"
              className="shrink-0 text-xs font-semibold inline-flex items-center gap-0.5 transition hover:opacity-80"
              style={{ color: "#6D4AFF" }}
            >
              {t("All", "সব")} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-sm text-center py-12" style={{ color: "#667085" }}>{t("No sales yet", "এখনও কোনো সেল নেই")}</div>
          ) : (
            <div className="space-y-1.5">
              {topProducts.map((p, i) => (
                <div
                  key={p.name + i}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 rounded-xl px-2 transition"
                  style={{ background: i % 2 === 0 ? "rgba(238,233,255,0.35)" : "transparent" }}
                >
                  <span className="w-7 text-[12px] font-black tabular-nums" style={{ color: "#6D4AFF" }}>#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold truncate" style={{ color: "#15192C" }}>{p.name}</div>
                    <div className="text-[11px] font-semibold tabular-nums" style={{ color: "#667085" }}>{p.sold} {t("sold", "বিক্রি")}</div>
                  </div>
                  <div className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: "#6D4AFF" }}>{fmtBDT(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Conversion Stats */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #E4E7EF" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: "linear-gradient(to bottom, #6D4AFF, #4f46e5)" }} />
              <h4 className="text-sm font-extrabold tracking-wider uppercase" style={{ color: "#15192C" }}>{t("Conversion Stats", "কনভার্শন স্ট্যাটস")}</h4>
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
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: "linear-gradient(to bottom, #6D4AFF, #4f46e5)" }} />
      <h2 className="text-sm sm:text-base font-extrabold tracking-wider uppercase" style={{ color: "#15192C" }}>
        {title}
      </h2>
    </div>
  );
}

function KpiCard({ kpi, loading, compact }: { kpi: any; loading: boolean; compact?: boolean }) {
  const { Icon } = kpi;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${compact ? "p-4" : "p-5"} transition-all duration-200 hover:-translate-y-0.5`}
      style={{
        background: kpi.bgGrad || "#ffffff",
        border: `1px solid ${kpi.borderColor || "#E4E7EF"}`,
        boxShadow: "0 4px 20px rgba(109,74,255,0.04), 0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      {/* Purple top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, transparent, rgba(109,74,255,0.4), transparent)" }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`w-10 h-10 rounded-xl grid place-items-center text-white shrink-0 bg-gradient-to-br ${kpi.iconGrad}`}
            style={{ boxShadow: "0 4px 14px -3px rgba(109,74,255,0.30), inset 0 1px 0 rgba(255,255,255,0.25)" }}
          >
            <Icon className="w-4.5 h-4.5" strokeWidth={2.3} />
          </span>
          {typeof kpi.delta === "number" && kpi.delta !== 0 && (
            <span
              className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                color: kpi.delta >= 0 ? "#15803D" : "#DC2626",
                background: kpi.delta >= 0 ? "rgba(21,128,61,0.08)" : "rgba(220,38,38,0.08)",
                border: `1px solid ${kpi.delta >= 0 ? "rgba(21,128,61,0.15)" : "rgba(220,38,38,0.15)"}`,
              }}
            >
              {kpi.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.delta)}%
            </span>
          )}
        </div>
        <div
          className={`${compact ? "mt-4" : "mt-5"} text-[10px] font-extrabold tracking-wider uppercase truncate`}
          style={{ color: "#667085" }}
        >
          {kpi.label}
        </div>
        <div
          className={`mt-0.5 ${compact ? "text-[22px]" : "text-[26px] sm:text-[29px]"} font-black tracking-tight tabular-nums truncate`}
          style={{ fontFamily: "var(--font-heading)", color: "#15192C" }}
        >
          {loading ? (
            <span
              className="inline-block w-20 h-7 rounded-lg animate-pulse"
              style={{ background: "rgba(238,233,255,0.6)" }}
            />
          ) : kpi.value}
        </div>
        {kpi.sub && !loading && (
          <div className="mt-1 text-[11px] font-medium truncate" style={{ color: "#667085" }}>{kpi.sub}</div>
        )}
      </div>
    </div>
  );
}

function ConvRow({ label, value, Icon, color }: { label: string; value: string; Icon: any; color: "violet" | "emerald" | "sky" | "orange" }) {
  const map = {
    violet: { bg: "rgba(238,233,255,0.7)", text: "#6D4AFF", border: "rgba(109,74,255,0.18)" },
    emerald: { bg: "rgba(21,128,61,0.08)", text: "#15803D", border: "rgba(21,128,61,0.18)" },
    sky: { bg: "rgba(14,165,233,0.08)", text: "#0284c7", border: "rgba(14,165,233,0.20)" },
    orange: { bg: "rgba(180,83,9,0.08)", text: "#B45309", border: "rgba(180,83,9,0.18)" },
  } as const;
  const s = map[color];
  return (
    <div className="flex items-center gap-3 py-1">
      <span
        className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1 text-[12.5px] font-semibold truncate" style={{ color: "#667085" }}>{label}</div>
      <div className="text-[13px] font-bold tabular-nums shrink-0" style={{ color: "#15192C" }}>{value}</div>
    </div>
  );
}
