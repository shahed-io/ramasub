import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Activity, ShoppingCart, Users, Percent, RotateCcw,
  DollarSign, BarChart3, PieChart as PieIcon, Clock, Package,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";

type Order = {
  id: string; created_at: string; status: string; total: number;
  payment_method: string | null; items: unknown;
};

const PIE_COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#ec4899", "#8b5cf6"];

function fmtMoney(n: number) {
  return "৳" + Math.round(n).toLocaleString("en-US");
}

export function AnalyticsDashboard() {
  const { t } = useAdminLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 30 | 90 | 365>(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id,created_at,status,total,payment_method,items")
        .order("created_at", { ascending: false })
        .limit(2000);
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - range * 86400000);
    const prevStart = new Date(start.getTime() - range * 86400000);
    let revenue = 0, count = 0, prevRev = 0, prevCount = 0;
    let completed = 0, cancelled = 0;
    const customers = new Set<string>();
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const tot = Number(o.total) || 0;
      const live = (o.status || "").toLowerCase() !== "cancelled";
      if (d >= start) {
        count++;
        if (live) revenue += tot;
        customers.add((o as any).email || o.id);
        const s = (o.status || "").toLowerCase();
        if (s === "completed" || s === "delivered") completed++;
        if (s === "cancelled") cancelled++;
      } else if (d >= prevStart && d < start) {
        prevCount++;
        if (live) prevRev += tot;
      }
    });
    const avg = count ? revenue / count : 0;
    const completion = count ? Math.round((completed / count) * 100) : 0;
    const refundPct = count ? Math.round((cancelled / count) * 100) : 0;
    const revDelta = prevRev > 0 ? Math.round(((revenue - prevRev) / prevRev) * 100) : 0;
    const ordDelta = prevCount > 0 ? Math.round(((count - prevCount) / prevCount) * 100) : 0;
    return { revenue, count, avg, customers: customers.size, completion, refundPct, revDelta, ordDelta };
  }, [orders, range]);

  const trend = useMemo(() => {
    const arr: { date: string; value: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const next = new Date(d.getTime() + 86400000);
      let v = 0;
      orders.forEach((o) => {
        const od = new Date(o.created_at);
        if (od >= d && od < next && (o.status || "").toLowerCase() !== "cancelled") v += Number(o.total) || 0;
      });
      arr.push({ date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`, value: v });
    }
    return arr;
  }, [orders, range]);

  const statusData = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => {
      const s = (o.status || "unknown").toLowerCase();
      m[s] = (m[s] || 0) + 1;
    });
    const colors: Record<string, string> = {
      completed: "#10b981", delivered: "#10b981", pending: "#a78bfa",
      refunded: "#a78bfa", failed: "#f59e0b", cancelled: "#ef4444",
    };
    return Object.entries(m).map(([name, value]) => ({ name, value, fill: colors[name] || "#94a3b8" }));
  }, [orders]);

  const paymentData = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => {
      const p = o.payment_method || "unknown";
      m[p] = (m[p] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, count: 0 }));
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      arr[h].count++;
    });
    return arr;
  }, [orders]);

  const topProducts = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => {
      if ((o.status || "").toLowerCase() === "cancelled") return;
      if (!Array.isArray(o.items)) return;
      (o.items as any[]).forEach((it) => {
        const name = it?.name || it?.title || it?.product_name || "Unknown";
        const price = Number(it?.price ?? it?.amount ?? 0);
        const qty = Number(it?.quantity ?? it?.qty ?? 1);
        m[name] = (m[name] || 0) + price * qty;
      });
    });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [orders]);

  const ranges: { v: 7 | 30 | 90 | 365; l: string }[] = [
    { v: 7, l: t("7 days", "৭ দিন") },
    { v: 30, l: t("30 days", "৩০ দিন") },
    { v: 90, l: t("90 days", "৯০ দিন") },
    { v: 365, l: t("1 year", "১ বছর") },
  ];

  const kpis = [
    { icon: <DollarSign className="w-5 h-5" />, label: t("Net Revenue", "নেট রেভিনিউ"), value: fmtMoney(stats.revenue), delta: stats.revDelta, tone: "emerald" },
    { icon: <ShoppingCart className="w-5 h-5" />, label: t("Net Orders", "নেট অর্ডার"), value: String(stats.count), delta: stats.ordDelta, tone: "violet" },
    { icon: <Activity className="w-5 h-5" />, label: t("Avg Order Value", "গড় অর্ডার ভ্যালু"), value: fmtMoney(stats.avg), delta: 0, tone: "amber" },
    { icon: <Users className="w-5 h-5" />, label: t("Active Customers", "সক্রিয় কাস্টমার"), value: String(stats.customers), delta: 0, tone: "sky" },
    { icon: <Percent className="w-5 h-5" />, label: t("Completion Rate", "কমপ্লিশন রেট"), value: stats.completion + "%", delta: 0, tone: "indigo" },
    { icon: <RotateCcw className="w-5 h-5" />, label: t("Refund Rate", "রিফান্ড রেট"), value: stats.refundPct + "%", delta: 0, tone: "rose" },
  ];

  const toneRing: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
  };


  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -right-32 bottom-0 w-72 h-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="w-12 h-12 rounded-xl bg-white shadow-sm ring-1 ring-violet-100 grid place-items-center text-violet-600">
            <TrendingUp className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
              {t("Analytics & Reports", "অ্যানালিটিক্স ও রিপোর্ট")}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {t("Reports • Manage and configure analytics & reports", "রিপোর্ট • অ্যানালিটিক্স ও রিপোর্ট দেখুন")}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t("Advanced Analytics", "অ্যাডভান্সড অ্যানালিটিক্স")}</h2>
            <p className="text-xs text-slate-500">{t("Store performance & insights", "স্টোরের পারফরম্যান্স ও ইনসাইট")}</p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            {ranges.map((r) => (
              <button
                key={r.v}
                onClick={() => setRange(r.v)}
                className={`px-3 h-8 rounded-full text-xs font-semibold transition ${range === r.v ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {r.l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-100 p-3.5 hover:border-violet-200 hover:shadow-sm transition">
              <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 rounded-lg ring-1 grid place-items-center ${toneRing[k.tone]}`}>{k.icon}</span>
                {k.delta !== 0 && (
                  <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${k.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}%
                  </span>
                )}
              </div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">{loading ? "…" : k.value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><TrendingUp className="w-4 h-4" /></span>
          <h3 className="font-bold text-slate-900">{t("Revenue Trend", "রেভিনিউ ট্রেন্ড")}</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: number) => [fmtMoney(v), t("Revenue", "রেভিনিউ")]}
              />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-up: Order Status + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><BarChart3 className="w-4 h-4" /></span>
            <h3 className="font-bold text-slate-900">{t("Order Status", "অর্ডার স্ট্যাটাস")}</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><PieIcon className="w-4 h-4" /></span>
            <h3 className="font-bold text-slate-900">{t("Payment Methods", "পেমেন্ট মেথড")}</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {paymentData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-up: Hourly + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 grid place-items-center"><Clock className="w-4 h-4" /></span>
            <h3 className="font-bold text-slate-900">{t("Hourly Orders", "ঘণ্টাভিত্তিক অর্ডার")}</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-fuchsia-50 text-fuchsia-600 grid place-items-center"><Package className="w-4 h-4" /></span>
            <h3 className="font-bold text-slate-900">{t("Top Products", "টপ প্রোডাক্ট")}</h3>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">{t("No data yet", "এখনো ডেটা নেই")}</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const max = topProducts[0].value || 1;
                const pct = Math.max(6, (p.value / max) * 100);
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="shrink-0 w-5 text-[11px] font-bold text-slate-400 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-slate-700 truncate">{p.name}</span>
                        <span className="text-[11px] font-bold text-slate-900 shrink-0">{fmtMoney(p.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
