import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  Download,
  RefreshCw,
  Calendar,
  Wallet,
  Ticket,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/reports")({
  component: ReportsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Range = "7d" | "30d" | "90d" | "365d" | "all";

type OrderRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  total: number | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  items: unknown;
};

type ProductRow = {
  slug: string;
  name: string;
  meta: Record<string, unknown> | null;
  plans: unknown;
};

function rangeStart(range: Range): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function fetchReportData(range: Range) {
  const start = rangeStart(range);
  let q = supabase
    .from("orders")
    .select("id,email,full_name,total,status,payment_method,payment_status,created_at,items")
    .order("created_at", { ascending: false });
  if (start) q = q.gte("created_at", start.toISOString());
  const { data: orders, error } = await q;
  if (error) throw error;

  const { data: products } = await supabase
    .from("products")
    .select("slug,name,meta,plans");

  return {
    orders: (orders ?? []) as OrderRow[],
    products: (products ?? []) as ProductRow[],
  };
}

function fmtBDT(n: number): string {
  return "৳ " + Math.round(n).toLocaleString("en-IN");
}

function statusTone(s: string): string {
  const k = s.toLowerCase();
  if (k.includes("complet") || k.includes("deliver") || k.includes("paid")) return "bg-blue-100 text-blue-700";
  if (k.includes("pend")) return "bg-amber-100 text-amber-700";
  if (k.includes("cancel") || k.includes("refund") || k.includes("fail")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function isRevenueOrder(o: OrderRow): boolean {
  const s = (o.status || "").toLowerCase();
  if (s.includes("cancel") || s.includes("refund") || s.includes("fail")) return false;
  return true;
}

function itemsOf(o: OrderRow): Array<{ slug?: string; name?: string; qty?: number; price?: number }> {
  const raw = o.items;
  if (!Array.isArray(raw)) return [];
  return raw as Array<{ slug?: string; name?: string; qty?: number; price?: number }>;
}

function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>{icon}</div>
      <div className="mt-4 text-2xl font-black text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[11px] font-semibold text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function ReportsPage() {
  const { t } = useAdminLang();
  const [range, setRange] = useState<Range>("30d");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-reports", range],
    queryFn: () => fetchReportData(range),
    staleTime: 30_000,
  });

  const orders = data?.orders ?? [];
  const products = data?.products ?? [];

  const summary = useMemo(() => {
    const revenueOrders = orders.filter(isRevenueOrder);
    const revenue = revenueOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const customers = new Set(
      revenueOrders.map((o) => (o.email || o.full_name || o.id).toLowerCase()),
    );
    const aov = revenueOrders.length ? revenue / revenueOrders.length : 0;
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      const k = o.status || "unknown";
      statusCounts[k] = (statusCounts[k] || 0) + 1;
    }
    const paymentCounts: Record<string, number> = {};
    for (const o of revenueOrders) {
      const k = o.payment_method || "other";
      paymentCounts[k] = (paymentCounts[k] || 0) + Number(o.total || 0);
    }
    return {
      revenue,
      orderCount: orders.length,
      revenueOrderCount: revenueOrders.length,
      customers: customers.size,
      aov,
      statusCounts,
      paymentCounts,
    };
  }, [orders]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; count: number }>();
    for (const o of orders) {
      if (!isRevenueOrder(o)) continue;
      const d = o.created_at.slice(0, 10);
      const cur = map.get(d) || { date: d, revenue: 0, count: 0 };
      cur.revenue += Number(o.total || 0);
      cur.count += 1;
      map.set(d, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders]);

  const topProducts = useMemo(() => {
    const bySlug = new Map<string, { slug: string; name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      if (!isRevenueOrder(o)) continue;
      for (const it of itemsOf(o)) {
        const slug = String(it.slug || it.name || "unknown");
        const cur = bySlug.get(slug) || { slug, name: String(it.name || slug), qty: 0, revenue: 0 };
        cur.qty += Number(it.qty || 1);
        cur.revenue += Number(it.price || 0) * Number(it.qty || 1);
        bySlug.set(slug, cur);
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [orders]);

  const topCustomers = useMemo(() => {
    const byEmail = new Map<string, { key: string; name: string; email: string; orders: number; spent: number }>();
    for (const o of orders) {
      if (!isRevenueOrder(o)) continue;
      const key = (o.email || o.full_name || o.id).toLowerCase();
      const cur = byEmail.get(key) || {
        key,
        name: o.full_name || "—",
        email: o.email || "—",
        orders: 0,
        spent: 0,
      };
      cur.orders += 1;
      cur.spent += Number(o.total || 0);
      byEmail.set(key, cur);
    }
    return Array.from(byEmail.values()).sort((a, b) => b.spent - a.spent).slice(0, 10);
  }, [orders]);

  const inventoryStats = useMemo(() => {
    let out = 0, low = 0, ok = 0, tracked = 0;
    for (const p of products) {
      const meta = (p.meta || {}) as Record<string, unknown>;
      if (typeof meta.stock !== "number") continue;
      tracked++;
      const stock = meta.stock as number;
      const lowAt = typeof meta.low_stock_at === "number" ? (meta.low_stock_at as number) : 5;
      if (stock <= 0) out++;
      else if (stock <= lowAt) low++;
      else ok++;
    }
    return { out, low, ok, tracked, total: products.length };
  }, [products]);

  function exportCSV() {
    const rows = [
      ["Date", "Order ID", "Customer", "Email", "Total", "Status", "Payment Method"],
      ...orders.map((o) => [
        o.created_at.slice(0, 19).replace("T", " "),
        o.id,
        o.full_name || "",
        o.email || "",
        String(o.total ?? 0),
        o.status || "",
        o.payment_method || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ranges: { key: Range; label: string }[] = [
    { key: "7d", label: t("7 days", "৭ দিন") },
    { key: "30d", label: t("30 days", "৩০ দিন") },
    { key: "90d", label: t("90 days", "৯০ দিন") },
    { key: "365d", label: t("1 year", "১ বছর") },
    { key: "all", label: t("All time", "সব সময়") },
  ];

  const maxDaily = Math.max(1, ...daily.map((d) => d.revenue));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-50 p-5 sm:p-6 border border-white/60 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white grid place-items-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{t("Reports", "রিপোর্ট")}</h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                {t(
                  "Live business reports from your website — sales, customers, products, inventory",
                  "আপনার ওয়েবসাইটের লাইভ বিজনেস রিপোর্ট — সেলস, কাস্টমার, প্রোডাক্ট, ইনভেন্টরি",
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              {t("Refresh", "রিফ্রেশ")}
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-slate-800 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {t("Export CSV", "CSV এক্সপোর্ট")}
            </button>
          </div>
        </div>

        {/* Range chips */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-slate-500" />
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                range === r.key
                  ? "bg-indigo-600 text-white border-indigo-600 shadow"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-blue-500 to-blue-600"
          label={t("Total Revenue", "মোট রেভিনিউ")}
          value={fmtBDT(summary.revenue)}
          sub={`${summary.revenueOrderCount} ${t("valid orders", "বৈধ অর্ডার")}`}
        />
        <StatCard
          icon={<ShoppingBag className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-blue-500 to-indigo-600"
          label={t("Orders", "অর্ডার")}
          value={summary.orderCount.toLocaleString()}
          sub={t("All statuses", "সব স্ট্যাটাস")}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-indigo-500 to-pink-500"
          label={t("Unique Customers", "ইউনিক কাস্টমার")}
          value={summary.customers.toLocaleString()}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          tone="bg-gradient-to-br from-amber-500 to-orange-500"
          label={t("Avg Order Value", "গড় অর্ডার মূল্য")}
          value={fmtBDT(summary.aov)}
        />
      </div>

      {/* Sales trend */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {t("Sales Trend", "সেলস ট্রেন্ড")}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {t("Daily revenue over selected range", "নির্বাচিত সময়ে দৈনিক রেভিনিউ")}
            </p>
          </div>
        </div>
        {daily.length === 0 ? (
          <div className="py-10 text-center text-sm font-semibold text-slate-500">
            {t("No sales in this range", "এই সময়ে কোনো সেল নেই")}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
            {daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-24 text-xs font-bold text-slate-600 tabular-nums">{d.date}</div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-full"
                    style={{ width: `${(d.revenue / maxDaily) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-xs font-black text-slate-900 tabular-nums">
                  {fmtBDT(d.revenue)}
                </div>
                <div className="w-12 text-right text-[11px] font-bold text-slate-500 tabular-nums">
                  {d.count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two column: Top products + status breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            {t("Top Products", "টপ প্রোডাক্ট")}
          </h2>
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No product sales", "কোনো প্রোডাক্ট সেল নেই")}
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <div key={p.slug} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 grid place-items-center text-xs font-black">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{p.qty} {t("sold", "সেল")}</div>
                  </div>
                  <div className="text-sm font-black text-blue-600 tabular-nums">{fmtBDT(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-600" />
            {t("Order Status", "অর্ডার স্ট্যাটাস")}
          </h2>
          {Object.keys(summary.statusCounts).length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No orders", "কোনো অর্ডার নেই")}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {Object.entries(summary.statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const pct = summary.orderCount ? (v / summary.orderCount) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className={`px-2 py-0.5 rounded-full ${statusTone(k)}`}>{k}</span>
                        <span className="text-slate-700 tabular-nums">{v} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mt-6">
            <Wallet className="w-4 h-4 text-indigo-600" />
            {t("Payment Methods", "পেমেন্ট মেথড")}
          </h3>
          {Object.keys(summary.paymentCounts).length === 0 ? (
            <div className="py-6 text-center text-sm font-semibold text-slate-500">
              {t("No payments", "কোনো পেমেন্ট নেই")}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {Object.entries(summary.paymentCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const pct = summary.revenue ? (v / summary.revenue) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">{k}</span>
                        <span className="text-slate-700 tabular-nums">{fmtBDT(v)} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Top customers + inventory */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-indigo-600" />
            {t("Top Customers", "টপ কাস্টমার")}
          </h2>
          {topCustomers.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-slate-500">
              {t("No customers yet", "এখনো কোনো কাস্টমার নেই")}
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {topCustomers.map((c, i) => (
                <div key={c.key} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 grid place-items-center text-xs font-black">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{c.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-blue-600 tabular-nums">{fmtBDT(c.spent)}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{c.orders} {t("orders", "অর্ডার")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            {t("Inventory Snapshot", "ইনভেন্টরি স্ন্যাপশট")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <div className="text-xs font-bold text-blue-700">{t("In stock", "স্টকে")}</div>
              <div className="text-2xl font-black text-blue-800 tabular-nums">{inventoryStats.ok}</div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-xs font-bold text-amber-700">{t("Low stock", "কম স্টক")}</div>
              <div className="text-2xl font-black text-amber-800 tabular-nums">{inventoryStats.low}</div>
            </div>
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
              <div className="text-xs font-bold text-rose-700">{t("Out of stock", "স্টক নেই")}</div>
              <div className="text-2xl font-black text-rose-800 tabular-nums">{inventoryStats.out}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs font-bold text-slate-700">{t("Total products", "মোট প্রোডাক্ট")}</div>
              <div className="text-2xl font-black text-slate-800 tabular-nums">{inventoryStats.total}</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            {t(
              `Tracked with stock meta: ${inventoryStats.tracked}`,
              `স্টক ট্র্যাক করা হয়েছে: ${inventoryStats.tracked}`,
            )}
          </p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
        <h2 className="text-base font-black text-slate-900">
          {t("Recent Orders", "সাম্প্রতিক অর্ডার")}
        </h2>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-sm font-semibold text-slate-500">
            {t("No orders in range", "এই সময়ে অর্ডার নেই")}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2 pr-3">{t("Date", "তারিখ")}</th>
                  <th className="py-2 pr-3">{t("Customer", "কাস্টমার")}</th>
                  <th className="py-2 pr-3">{t("Method", "মেথড")}</th>
                  <th className="py-2 pr-3">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="py-2 pr-3 text-right">{t("Total", "মোট")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 20).map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {o.created_at.slice(0, 10)}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="text-sm font-bold text-slate-900 truncate max-w-[180px]">
                        {o.full_name || "—"}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 truncate max-w-[180px]">
                        {o.email || "—"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs font-semibold text-slate-700">
                      {o.payment_method || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusTone(o.status || "")}`}>
                        {o.status || "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-sm font-black text-slate-900 tabular-nums">
                      {fmtBDT(Number(o.total || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
