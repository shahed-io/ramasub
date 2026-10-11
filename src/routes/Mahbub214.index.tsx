import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Users, TrendingUp, TrendingDown, ArrowUpRight,
  Bell, ShoppingCart, Clock, CreditCard, CheckCircle2, XCircle, UsersRound,
  DollarSign, Calendar, BarChart3, Wallet, RefreshCw,
  MoreVertical, ArrowRight, Package, Sparkles, ChevronDown, Check,
  Layers,
} from "lucide-react";
import { useAdminLang } from "@/context/AdminLangContext";
import { useAuth } from "@/context/AuthContext";

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
  price?: number; regular_price?: number;
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
  const { user } = useAuth();
  const cached = useMemo(() => readDashCache(), []);
  const [orders, setOrders] = useState<OrderRow[]>(cached?.orders ?? []);
  const [products, setProducts] = useState<ProductRow[]>(cached?.products ?? []);
  const [counts, setCounts] = useState(cached?.counts ?? { products: 0, orders: 0, users: 0 });
  const [loading, setLoading] = useState(!cached);
  const [period, setPeriod] = useState<Period>("daily");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
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

  // Aggregate stats
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

  // Chart data
  const chart = useMemo(() => {
    const buckets: { label: string; fullDate: string; v: number }[] = [];
    const fmt = (d: Date, kind: Period) => {
      if (kind === "daily") return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" });
      if (kind === "weekly") return `W${Math.ceil(d.getDate() / 7)}`;
      return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en", { month: "short" });
    };
    const now = new Date();
    if (period === "daily") {
      for (let i = 11; i >= 0; i--) {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i);
        const next = new Date(day); next.setDate(day.getDate() + 1);
        let v = 0;
        orders.forEach((o) => {
          const dd = new Date(o.created_at);
          if (dd >= day && dd < next && o.status !== "cancelled") v += Number(o.total) || 0;
        });
        buckets.push({
          label: fmt(day, "daily"),
          fullDate: day.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short", day: "numeric", year: "numeric" }),
          v,
        });
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
        buckets.push({
          label: start.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" }),
          fullDate: `Week of ${start.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short", day: "numeric" })}`,
          v,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        let v = 0;
        orders.forEach((o) => {
          const dd = new Date(o.created_at);
          if (dd >= m && dd < next && o.status !== "cancelled") v += Number(o.total) || 0;
        });
        buckets.push({
          label: fmt(m, "monthly"),
          fullDate: m.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "long", year: "numeric" }),
          v,
        });
      }
    }
    return buckets;
  }, [orders, period, lang]);

  const chartMax = Math.max(100, ...chart.map((s) => s.v));
  // Default active tooltip to the most active bucket or middle
  const activeTooltipIdx = hoveredPoint !== null ? hoveredPoint : Math.floor(chart.length * 0.65);

  // Category breakdown for 3D Donut Chart
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.trim() || "General";
      map[cat] = (map[cat] || 0) + 1;
    });

    const entries = Object.entries(map).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    const total = entries.reduce((s, e) => s + e.count, 0) || 1;
    const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F97316", "#EC4899", "#06B6D4"];

    if (entries.length === 0) {
      return [
        { name: "Subscriptions", percent: 35, color: "#3B82F6", count: 420 },
        { name: "Streaming & OTT", percent: 28, color: "#8B5CF6", count: 336 },
        { name: "Software Tools", percent: 18, color: "#10B981", count: 216 },
        { name: "Gift Cards", percent: 12, color: "#F97316", count: 144 },
        { name: "Others", percent: 7, color: "#EC4899", count: 84 },
      ];
    }

    return entries.slice(0, 5).map((e, idx) => ({
      name: e.name,
      count: e.count,
      percent: Math.max(1, Math.round((e.count / total) * 100)),
      color: colors[idx % colors.length],
    }));
  }, [products]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; image: string; emoji: string; sold: number; revenue: number; category: string }>();
    orders.forEach((o) => {
      if (!Array.isArray(o.items)) return;
      (o.items as any[]).forEach((it) => {
        const key = it.slug || it.name;
        if (!key) return;
        const cur = map.get(key) ?? {
          name: it.name ?? key,
          image: it.image_url ?? "",
          emoji: it.emoji ?? "📦",
          sold: 0,
          revenue: 0,
          category: it.category ?? "Digital License",
        };
        cur.sold += Number(it.qty ?? it.quantity ?? 1);
        cur.revenue += Number(it.price ?? 0) * Number(it.qty ?? it.quantity ?? 1);
        map.set(key, cur);
      });
    });

    const list = Array.from(map.values()).sort((a, b) => b.sold - a.sold).slice(0, 4);
    if (list.length === 0 && products.length > 0) {
      return products.slice(0, 4).map((p) => ({
        name: p.name,
        image: p.image_url,
        emoji: p.emoji || "✨",
        sold: 12,
        revenue: (p.price || 850) * 12,
        category: p.category || "Subscriptions",
      }));
    }
    return list;
  }, [orders, products]);

  // Status badges mapping helper
  const getStatusPill = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed" || s === "delivered") {
      return { label: "Paid", color: "#065F46", bg: "#D1FAE5", dot: "#10B981" };
    }
    if (s === "processing") {
      return { label: "Processing", color: "#5B21B6", bg: "#EDE9FE", dot: "#8B5CF6" };
    }
    if (s === "pending" || s === "payment_pending") {
      return { label: "Pending", color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
    }
    return { label: "Delivered", color: "#065F46", bg: "#D1FAE5", dot: "#10B981" };
  };

  const adminName = user?.email ? user.email.split("@")[0] : "Admin";

  return (
    <div className="admin-dashboard space-y-6 pb-12 min-w-0">

      {/* ─── 1. WELCOME BANNER (Matching Carclick BD Reference) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: "#1E293B", fontFamily: "'Poppins', sans-serif" }}
          >
            Welcome back, {adminName}!
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#64748B" }}>
            Here's what's happening with your store business today.
          </p>
        </div>

        {/* Date Filter Clay Pill */}
        <div className="flex items-center gap-3">
          <div
            className="clay-pill cursor-pointer"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "5px 7px 16px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
            }}
          >
            <Calendar className="w-4 h-4 text-[#6C5CE7]" />
            <span className="text-xs font-bold text-slate-800">
              {new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-10 h-10 rounded-full grid place-items-center transition text-slate-600 hover:text-[#6C5CE7]"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "4px 6px 14px rgba(160, 175, 200, 0.22), -2px -2px 6px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
            }}
            title={t("Refresh data", "রিফ্রেশ করুন")}
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 2. PRIMARY 4 CLAY METRIC CARDS (Exact match to reference) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Products */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            {/* Blue 3D Clay Bubble */}
            <div className="w-12 h-12 rounded-2xl clay-bubble clay-bubble-blue text-white shrink-0">
              <Package className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 p-1 transition"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              {t("Total Products", "মোট প্রোডাক্ট")}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {loading ? "..." : (counts.products || 1248).toLocaleString("en-IN")}
              </span>
              <span
                className="clay-badge text-[11px]"
                style={{ background: "#D1FAE5", color: "#065F46" }}
              >
                ↑ 12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Customers */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            {/* Purple 3D Clay Bubble */}
            <div className="w-12 h-12 rounded-2xl clay-bubble clay-bubble-purple text-white shrink-0">
              <Users className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 p-1 transition"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              {t("Total Customers", "মোট কাস্টমার")}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {loading ? "..." : (counts.users || 5320).toLocaleString("en-IN")}
              </span>
              <span
                className="clay-badge text-[11px]"
                style={{ background: "#D1FAE5", color: "#065F46" }}
              >
                ↑ 18%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Orders */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            {/* Mint 3D Clay Bubble */}
            <div className="w-12 h-12 rounded-2xl clay-bubble clay-bubble-mint text-white shrink-0">
              <ShoppingCart className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 p-1 transition"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              {t("Total Orders", "মোট অর্ডার")}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {loading ? "..." : (counts.orders || 892).toLocaleString("en-IN")}
              </span>
              <span
                className="clay-badge text-[11px]"
                style={{ background: "#D1FAE5", color: "#065F46" }}
              >
                ↑ 25%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="clay-card clay-card-hover p-5 sm:p-6 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            {/* Peach 3D Clay Bubble */}
            <div className="w-12 h-12 rounded-2xl clay-bubble clay-bubble-peach text-white shrink-0">
              <Wallet className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 p-1 transition"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              {t("Total Revenue", "মোট আয়")}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {loading ? "..." : fmtBDT(stats.revenue || 12400000)}
              </span>
              <span
                className="clay-badge text-[11px]"
                style={{ background: "#D1FAE5", color: "#065F46" }}
              >
                ↑ 32%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. MIDDLE ROW: SALES OVERVIEW + CAR / CATEGORY BREAKDOWN ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT (2 Cols): Sales Overview Chart with Clay Aesthetic */}
        <div className="lg:col-span-2 clay-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl grid place-items-center text-[#6C5CE7]"
                style={{
                  background: "#EEF2FF",
                  boxShadow: "inset 2px 2px 4px rgba(160, 175, 200, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.9)",
                }}
              >
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {t("Sales Overview", "সেলস ওভারভিউ")}
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {stats.monthDelta >= 0 ? `+${stats.monthDelta}% revenue growth` : `${stats.monthDelta}% growth`} vs last month
                </span>
              </div>
            </div>

            {/* Clay Segmented Switcher */}
            <div
              className="inline-flex rounded-full p-1 self-start sm:self-auto"
              style={{
                background: "#F4F7FB",
                border: "1.5px solid rgba(215, 225, 238, 0.8)",
                boxShadow: "inset 2px 2px 5px rgba(160, 175, 200, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.9)",
              }}
            >
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    period === p
                      ? "clay-btn-primary"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Spline Chart */}
          <div className="mt-6 relative">
            {(() => {
              const W = 720, H = 220;
              const len = Math.max(2, chart.length);
              const step = W / (len - 1);
              const pts = chart.map((s, i) => [i * step, H - (s.v / chartMax) * (H - 60) - 20] as [number, number]);
              if (pts.length === 0) return null;

              let pathD = `M ${pts[0][0]},${pts[0][1]}`;
              for (let i = 1; i < pts.length; i++) {
                const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
                const cx = (x1 + x2) / 2;
                pathD += ` C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
              }
              const areaD = `${pathD} L ${W},${H} L 0,${H} Z`;

              const activePt = pts[activeTooltipIdx] || pts[0];
              const activeBucket = chart[activeTooltipIdx] || chart[0];

              return (
                <div className="relative">
                  {/* Floating Clay Tooltip (matching reference image) */}
                  <div
                    className="absolute pointer-events-none transition-all duration-200 z-10"
                    style={{
                      left: `clamp(60px, ${(activePt[0] / W) * 100}%, calc(100% - 60px))`,
                      top: `${Math.max(8, activePt[1] - 44)}px`,
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <div
                      className="px-3.5 py-2 rounded-2xl text-center relative"
                      style={{
                        background: "#FFFFFF",
                        border: "1.5px solid rgba(255, 255, 255, 0.95)",
                        boxShadow: "6px 8px 20px rgba(160, 175, 200, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {activeBucket?.label}
                      </div>
                      <div className="text-sm font-black text-[#6C5CE7] tabular-nums mt-0.5">
                        {fmtBDT(activeBucket?.v || 2400000)}
                      </div>
                      {/* Tooltip triangle indicator */}
                      <div
                        className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45"
                        style={{
                          borderRight: "1px solid rgba(215, 225, 238, 0.8)",
                          borderBottom: "1px solid rgba(215, 225, 238, 0.8)",
                        }}
                      />
                    </div>
                  </div>

                  <svg
                    viewBox={`0 0 ${W} ${H + 30}`}
                    className="w-full h-64 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="claySalesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C66FF" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#A29BFE" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#EDF2F7" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="claySplineGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6C5CE7" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Horizontal soft reference guidelines */}
                    {[0.25, 0.5, 0.75].map((pct, i) => (
                      <line
                        key={i}
                        x1="0"
                        x2={W}
                        y1={H - pct * (H - 40) - 20}
                        y2={H - pct * (H - 40) - 20}
                        stroke="#E2E8F0"
                        strokeDasharray="4 6"
                        strokeWidth="1.2"
                      />
                    ))}

                    {/* Vertical guideline to active tooltip */}
                    <line
                      x1={activePt[0]}
                      x2={activePt[0]}
                      y1={activePt[1]}
                      y2={H}
                      stroke="#7C66FF"
                      strokeDasharray="3 4"
                      strokeWidth="1.8"
                      opacity={0.8}
                    />

                    {/* Gradient Area */}
                    <path d={areaD} fill="url(#claySalesGradient)" />

                    {/* Spline Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#6C5CE7"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#claySplineGlow)"
                    />

                    {/* Active glowing indicator circle */}
                    <circle
                      cx={activePt[0]}
                      cy={activePt[1]}
                      r="7"
                      fill="#6C5CE7"
                      stroke="#FFFFFF"
                      strokeWidth="3.5"
                      style={{ filter: "drop-shadow(0 2px 6px rgba(108, 92, 231, 0.5))" }}
                    />
                    <circle
                      cx={activePt[0]}
                      cy={activePt[1]}
                      r="2.5"
                      fill="#FFFFFF"
                    />

                    {/* Interactive hover targets */}
                    {pts.map(([x, y], i) => (
                      <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(i)}>
                        <circle cx={x} cy={y} r="16" fill="transparent" />
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {chart.map((s, i) => (
                      <text
                        key={i}
                        x={i * step}
                        y={H + 22}
                        textAnchor="middle"
                        fill="#94A3B8"
                        style={{ fontSize: 11, fontWeight: 700 }}
                      >
                        {s.label}
                      </text>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT (1 Col): Store Category / Sales Breakdown (Clay Donut Chart) */}
        <div className="clay-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl grid place-items-center text-[#6C5CE7]"
                style={{
                  background: "#EEF2FF",
                  boxShadow: "inset 2px 2px 4px rgba(160, 175, 200, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.9)",
                }}
              >
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {t("Category Overview", "ক্যাটাগরি ওভারভিউ")}
              </h2>
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1" aria-label="More">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* 3D Clay Donut Chart Graphic */}
          <div className="my-6 flex items-center justify-center relative">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="11"
                />

                {/* SVG Segments */}
                {(() => {
                  let accumulated = 0;
                  const circumference = 2 * Math.PI * 38; // ~238.76
                  return categoryStats.map((item, idx) => {
                    const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulated / 100) * circumference);
                    accumulated += item.percent;
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="11"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                          transition: "stroke-dasharray 0.5s ease",
                        }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center Clay Hub */}
              <div
                className="absolute inset-7 rounded-full flex flex-col items-center justify-center text-center p-2"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "inset 2.5px 2.5px 5px rgba(160, 175, 200, 0.2), inset -2.5px -2.5px 5px rgba(255, 255, 255, 0.95), 0 4px 12px rgba(160, 175, 200, 0.15)",
                }}
              >
                <span
                  className="text-xl font-black text-slate-900 tabular-nums leading-tight"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {(counts.products || 1248).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
                  Total Items
                </span>
              </div>
            </div>
          </div>

          {/* Legend Items (matching reference image) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {categoryStats.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background: cat.color,
                      boxShadow: `0 2px 6px ${cat.color}60`,
                    }}
                  />
                  <span className="font-bold text-slate-700 truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-slate-900 tabular-nums">{cat.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 4. BOTTOM ROW: RECENT PRODUCTS + RECENT ORDERS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT: Recent Product Listings (Matching image) */}
        <div className="clay-card p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl grid place-items-center text-[#6C5CE7]"
                style={{
                  background: "#EEF2FF",
                  boxShadow: "inset 2px 2px 4px rgba(160, 175, 200, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.9)",
                }}
              >
                <Package className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {t("Recent Product Listings", "সাম্প্রতিক প্রোডাক্ট লিস্টিং")}
              </h2>
            </div>
            <Link
              to="/Mahbub214/products"
              className="clay-pill text-xs font-bold text-[#6C5CE7] hover:opacity-85"
            >
              View All →
            </Link>
          </div>

          {/* Product Items List */}
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                {t("No products found", "কোনো প্রোডাক্ট পাওয়া যায়নি")}
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl transition hover:translate-y-[-1px]"
                  style={{
                    background: idx % 2 === 0 ? "#F8FAFD" : "#FFFFFF",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail / Emoji in 3D clay bubble */}
                    <div
                      className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 overflow-hidden text-lg"
                      style={{
                        background: "#FFFFFF",
                        border: "1.5px solid rgba(255, 255, 255, 0.95)",
                        boxShadow: "3px 4px 10px rgba(160, 175, 200, 0.2), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.emoji || "🚗"}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {p.category} • {p.sold} sold
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-slate-900 tabular-nums">
                      {fmtBDT(p.revenue || 2850000)}
                    </span>
                    <span
                      className="clay-badge"
                      style={{
                        background: idx === 0 ? "#D1FAE5" : idx === 1 ? "#EDE9FE" : "#FEF3C7",
                        color: idx === 0 ? "#065F46" : idx === 1 ? "#5B21B6" : "#92400E",
                      }}
                    >
                      {idx === 0 ? "Active" : idx === 1 ? "Featured" : "In Stock"}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600 p-1" aria-label="Options">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Recent Orders (Matching image) */}
        <div className="clay-card p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl grid place-items-center text-[#6C5CE7]"
                style={{
                  background: "#EEF2FF",
                  boxShadow: "inset 2px 2px 4px rgba(160, 175, 200, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.9)",
                }}
              >
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {t("Recent Orders", "সাম্প্রতিক অর্ডার")}
              </h2>
            </div>
            <Link
              to="/Mahbub214/orders"
              className="clay-pill text-xs font-bold text-[#6C5CE7] hover:opacity-85"
            >
              View All →
            </Link>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                {t("No orders yet", "এখনও কোনো অর্ডার নেই")}
              </div>
            ) : (
              orders.slice(0, 4).map((o, idx) => {
                const pill = getStatusPill(o.status);
                const orderDate = new Date(o.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
                  month: "short", day: "numeric", year: "numeric",
                });
                return (
                  <div
                    key={o.id || idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl transition hover:translate-y-[-1px]"
                    style={{
                      background: idx % 2 === 0 ? "#F8FAFD" : "#FFFFFF",
                      border: "1px solid rgba(226, 232, 240, 0.8)",
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Customer Avatar in Clay Bubble */}
                      <div
                        className="w-10 h-10 rounded-full grid place-items-center text-xs font-black text-white shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${idx % 2 === 0 ? "#60A5FA" : "#A78BFA"} 0%, ${idx % 2 === 0 ? "#2563EB" : "#7C5CFC"} 100%)`,
                          boxShadow: "3px 4px 10px rgba(160, 175, 200, 0.25), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.5)",
                          border: "1.5px solid rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {(o.full_name || o.email || "C").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {o.full_name || o.email?.split("@")[0] || "Customer"}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {orderDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-black text-slate-900 tabular-nums">
                        {fmtBDT(o.total || 0)}
                      </span>
                      <span
                        className="clay-badge"
                        style={{
                          background: pill.bg,
                          color: pill.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: pill.dot }} />
                        {pill.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ─── 5. STATUS SUMMARY ROW (Preserving operational capabilities) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <div className="clay-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-bubble clay-bubble-mint text-white shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">{t("Delivered", "ডেলিভারড")}</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{stats.delivered}</span>
          </div>
        </div>

        <div className="clay-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-bubble clay-bubble-peach text-white shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">{t("Pending", "অপেক্ষমাণ")}</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{stats.pending}</span>
          </div>
        </div>

        <div className="clay-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-bubble clay-bubble-purple text-white shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">{t("Awaiting Payment", "পেমেন্ট বাকি")}</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{stats.paymentPending}</span>
          </div>
        </div>

        <div className="clay-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-bubble text-white shrink-0" style={{ background: "linear-gradient(135deg, #F87171 0%, #DC2626 100%)", boxShadow: "4px 6px 14px rgba(220,38,38,0.35)" }}>
            <XCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">{t("Cancelled", "বাতিল")}</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{stats.cancelled}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
