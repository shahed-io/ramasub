import { createFileRoute } from "@tanstack/react-router";
import { waChatUrl } from "@/lib/whatsapp";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Eye, X, Download, Trash2, Plus, RefreshCw, MessageCircle,
  Pencil, Filter as FilterIcon, Search as SearchIcon, ShieldCheck,
  User as UserIcon, Mail, Phone, CreditCard, Package, FileText,
  Copy, Check, History as HistoryIcon, AlertCircle, X as XIcon, Radio,
  Sparkles, CheckCircle2, Clock, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadReceiptPdf } from "@/lib/receipt";
import { sendTransactionalEmail } from "@/lib/email/send";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/orders")({
  component: AdminOrders,
});

type OrderItem = { name: string; plan?: string; price: number; qty?: number; slug?: string; emoji?: string };
type Order = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  total: number;
  items: OrderItem[];
  transaction_id: string;
  payment_method: string;
  phone: string;
  email: string;
  full_name: string;
  user_id: string;
  admin_note: string | null;
  whatsapp_sent: boolean;
  payment_screenshot_url?: string | null;
  delivered_credentials?: { plan?: string; loginEmail?: string; loginPassword?: string; startsOn?: string; expiresOn?: string } | null;
};

const STATUSES = ["pending", "processing", "delivered", "completed", "cancelled", "refunded", "failed"] as const;
const PAYMENT_STATUSES = ["pending", "verified", "failed"] as const;

const shortId = (id: string) => "ORD-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
const fmtMoney = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");

function AdminOrders() {
  const { t } = useAdminLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let data: Order[] = [];
      try {
        const { listOrders } = await import("@/lib/orders.functions");
        const serverData = await listOrders();
        data = (serverData as unknown as Order[]) ?? [];
      } catch (serverErr) {
        // Direct fallback query via client
        const { data: directData, error: directErr } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!directErr && directData) {
          data = directData as unknown as Order[];
        } else {
          throw serverErr;
        }
      }

      // Also ensure direct client check adds any newly placed orders if server had delay
      if (data.length === 0) {
        const { data: fallbackOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (fallbackOrders && fallbackOrders.length > 0) {
          data = fallbackOrders as unknown as Order[];
        }
      }

      setOrders(data);
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Failed to load orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Sync unlisted orders from database (abandoned_checkouts / payment links)
  const syncDatabaseOrders = useCallback(async (isAuto = false) => {
    if (!isAuto) setSyncing(true);
    try {
      const { syncUnlistedOrders } = await import("@/lib/orders.functions");
      const res = await syncUnlistedOrders();
      if (res?.syncedCount && res.syncedCount > 0) {
        toast.success(
          t(
            `Synced ${res.syncedCount} unlisted order(s) from database`,
            `ডাটাবেজ থেকে ${res.syncedCount} টি নতুন অর্ডার সিঙ্ক করা হয়েছে`
          )
        );
        load(true);
      } else if (!isAuto) {
        toast.info(t("All database orders are already synced", "ডাটাবেজের সব অর্ডার ইতোমধ্যে সিঙ্ক করা আছে"));
      }
    } catch (err: any) {
      if (!isAuto) toast.error(err.message || "Database sync failed");
    } finally {
      if (!isAuto) setSyncing(false);
    }
  }, [load, t]);

  useEffect(() => {
    load();
    // Silent initial sync to ensure any unmigrated database orders are pulled in
    syncDatabaseOrders(true);
    const int = setInterval(() => load(true), 12000);
    return () => clearInterval(int);
  }, [load, syncDatabaseOrders]);

  const updateStatus = async (id: string, status: string) => {
    const target = orders.find((o) => o.id === id);
    const prev = orders;
    setOrders((o) => o.map((x) => x.id === id ? { ...x, status } : x));
    setSelected((s) => s && s.id === id ? { ...s, status } : s);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { setOrders(prev); toast.error(error.message); return; }
    toast.success(t(`Status updated to ${status}`, `স্ট্যাটাস আপডেট: ${status}`));
    if (target && target.status !== status) {
      import("@/lib/telegram").then(({ notifyTelegram }) => {
        notifyTelegram({
          event: "order_status_changed",
          title: "অর্ডার স্ট্যাটাস আপডেট",
          lines: [
            ["Order", `ANB-${id.slice(0, 8).toUpperCase()}`],
            ["Customer", target.full_name ?? "—"],
            ["From", target.status ?? "—"],
            ["To", status],
          ],
          url: `https://ramasub.com/admin/orders`,
        });
      });
      if (target.user_id) {
        import("@/lib/telegram-customer.functions").then(({ notifyCustomerOrderStatus }) => {
          notifyCustomerOrderStatus({
            data: {
              orderId: id,
              userId: target.user_id,
              status,
              fromStatus: target.status ?? null,
              fullName: target.full_name ?? null,
            },
          }).catch(() => {});
        });
      }
    }
    if (target && target.email && target.status !== status) {
      const sid = shortId(id);
      const firstName = target.full_name?.split(" ")[0];
      if (status === "completed" || status === "delivered") {
        const creds = target.delivered_credentials;
        const firstItem = target.items?.[0];
        sendTransactionalEmail({
          templateName: "subscription-activated",
          recipientEmail: target.email,
          idempotencyKey: `sub-activated-${id}`,
          templateData: {
            name: firstName,
            planName: creds?.plan || firstItem?.name || "Your subscription",
            startsOn: creds?.startsOn, expiresOn: creds?.expiresOn,
            loginEmail: creds?.loginEmail, loginPassword: creds?.loginPassword,
            manageUrl: "https://ramasub.com/orders",
          },
        }).catch(() => {});
        import("@/lib/software-downloads.functions")
          .then((m) => m.deliverDownloadsForOrder({ data: { orderId: id } }))
          .then((r: any) => { if (r?.ok) toast.success(t(`Sent ${r.sent} download link(s)`, `${r.sent} টি ডাউনলোড লিংক পাঠানো হয়েছে`)); })
          .catch(() => {});
      } else {
        sendTransactionalEmail({
          templateName: "order-status-update",
          recipientEmail: target.email,
          idempotencyKey: `order-status-${id}-${status}`,
          templateData: { name: firstName, orderId: sid, status, orderUrl: "https://ramasub.com/orders" },
        }).catch(() => {});
      }
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    const prev = orders;
    setOrders((o) => o.map((x) => x.id === id ? { ...x, payment_status } : x));
    setSelected((s) => s && s.id === id ? { ...s, payment_status } : s);
    const { error } = await supabase.from("orders").update({ payment_status } as never).eq("id", id);
    if (error) { setOrders(prev); toast.error(error.message); return; }
    toast.success(t("Payment status updated", "পেমেন্ট স্ট্যাটাস আপডেট"));
  };

  const saveAdminNote = async (id: string, admin_note: string) => {
    const { error } = await supabase.from("orders").update({ admin_note }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setOrders((o) => o.map((x) => x.id === id ? { ...x, admin_note } : x));
    toast.success(t("Saved", "সেভ হয়েছে"));
  };

  const deleteOrder = async (id: string) => {
    if (!confirm(t("Delete this order permanently?", "এই অর্ডারটি স্থায়ীভাবে মুছে ফেলতে চান?"))) return;
    const prev = orders;
    setOrders((o) => o.filter((x) => x.id !== id));
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { setOrders(prev); toast.error(error.message); return; }
    toast.success(t("Order deleted", "অর্ডার মুছে ফেলা হয়েছে"));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = useMemo(() => orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (paymentFilter !== "all" && (o.payment_status || "pending") !== paymentFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      o.id.toLowerCase().includes(s) ||
      shortId(o.id).toLowerCase().includes(s) ||
      o.full_name?.toLowerCase().includes(s) ||
      o.email?.toLowerCase().includes(s) ||
      o.phone?.toLowerCase().includes(s) ||
      o.transaction_id?.toLowerCase().includes(s)
    );
  }), [orders, filter, paymentFilter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUSES.forEach((s) => { c[s] = orders.filter((o) => o.status === s).length; });
    return c;
  }, [orders]);

  const totalRev = useMemo(
    () => orders.filter(o => o.status !== "cancelled" && o.status !== "failed" && o.status !== "refunded").reduce((a, o) => a + Number(o.total || 0), 0),
    [orders]
  );
  const pendingCount = counts["pending"] ?? 0;
  const processingCount = counts["processing"] ?? 0;
  const completedCount = (counts["completed"] ?? 0) + (counts["delivered"] ?? 0);

  const sLabel = (s: string) => {
    const m: Record<string, [string, string]> = {
      all: ["All Orders", "সব অর্ডার"],
      pending: ["Pending", "পেন্ডিং"],
      processing: ["Processing", "প্রসেসিং"],
      delivered: ["Delivered", "ডেলিভার্ড"],
      completed: ["Completed", "সম্পন্ন"],
      cancelled: ["Cancelled", "বাতিল"],
      refunded: ["Refunded", "রিফান্ড"],
      failed: ["Failed", "ব্যর্থ"],
    };
    const pair = m[s] || [s, s];
    return t(pair[0], pair[1]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* KPI Stat Cards (Image 2 - Pastel Luminous Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label={t("Total Revenue", "মোট রেভিনিউ")}
          value={fmtMoney(totalRev)}
          sub={t("Net successful sales", "সফল বিক্রির নেট পরিমাণ")}
          icon={<CreditCard className="w-5 h-5 text-violet-600" />}
          tone="violet"
          loading={loading}
        />
        <StatCard
          label={t("Pending", "পেন্ডিং")}
          value={pendingCount}
          sub={t("Awaiting verification", "ভেরিফিকেশনের অপেক্ষায়")}
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          tone="amber"
          loading={loading}
        />
        <StatCard
          label={t("Processing", "প্রসেসিং")}
          value={processingCount}
          sub={t("Under active fulfillment", "ডেলিভারি প্রক্রিয়ায়")}
          icon={<Clock className="w-5 h-5 text-sky-600" />}
          tone="sky"
          loading={loading}
        />
        <StatCard
          label={t("Completed", "সম্পন্ন")}
          value={completedCount}
          sub={t("Delivered & verified", "ডেলিভার্ড ও সমাপ্ত")}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
          tone="emerald"
          loading={loading}
        />
      </div>

      {/* Toolbar — counts, sync, actions */}
      <div className="rounded-[22px] p-3.5 sm:p-4 border border-white/80 ring-1 ring-slate-200/60 bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_10px_28px_-10px_rgba(99,102,241,0.06),0_2px_4px_rgba(15,23,42,0.02)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <span className="text-xl font-black text-slate-900 tabular-nums">{orders.length}</span>
            <span className="text-slate-500 font-medium">{t("total orders", "মোট অর্ডার")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80 shadow-xs">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> {t("WhatsApp Active", "WhatsApp সক্রিয়")}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Database Orders button */}
          <button
            onClick={() => syncDatabaseOrders(false)}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-xs font-bold text-violet-700 hover:from-violet-100 hover:to-indigo-100 transition shadow-xs disabled:opacity-50"
            title={t("Sync all orders & checkout records from database", "ডাটাবেজ থেকে সকল অর্ডার ও চেকআউট রেকর্ড সিঙ্ক করুন")}
          >
            <Sparkles className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-violet-500" : "text-violet-600"}`} />
            {syncing ? t("Syncing...", "সিঙ্ক হচ্ছে...") : t("Sync Database", "ডাটাবেজ সিঙ্ক")}
          </button>

          <button
            onClick={() => setFilter(filter === "cancelled" ? "all" : "cancelled")}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-bold transition shadow-xs ${
              filter === "cancelled"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("Trash", "ট্র্যাশ")}
          </button>

          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-slate-200/90 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-600" : ""}`} /> {t("Refresh", "রিফ্রেশ")}
          </button>

          <button
            onClick={() => setShowNewOrderModal(true)}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_4px_14px_-2px_rgba(124,58,237,0.35)] transition-all transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> {t("New Order", "নতুন অর্ডার")}
          </button>
        </div>
      </div>

      {/* Status filter pills (Fixed bug: never renders blank or white-on-white) */}
      <div className="flex flex-wrap gap-2 items-center">
        <Chip
          label={sLabel("all")}
          count={orders.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {(["pending", "processing", "delivered", "completed", "cancelled", "refunded", "failed"] as const).map((s) => (
          <Chip
            key={s}
            label={sLabel(s)}
            count={counts[s] ?? 0}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-[22px] p-3 border border-white/80 ring-1 ring-slate-200/60 bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-xl shadow-xs flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by Order ID, customer name, email, phone, TrxID…", "অর্ডার ID, নাম, ইমেইল, ফোন, TrxID দিয়ে খুঁজুন...")}
            className="w-full pl-10 pr-4 h-11 rounded-xl bg-white border border-slate-200/90 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition shadow-xs"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 h-11 rounded-xl border text-xs font-bold transition shadow-xs ${
            showFilters
              ? "bg-violet-50 text-violet-700 border-violet-200"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5" /> {t("Filter", "ফিল্টার")}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-[20px] p-3.5 border border-white/80 ring-1 ring-slate-200/60 bg-white/95 backdrop-blur-xl shadow-xs flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
          <span className="text-slate-500 font-extrabold mr-1 uppercase tracking-wide text-[11px]">{t("Payment Status", "পেমেন্ট স্ট্যাটাস")}:</span>
          {(["all", ...PAYMENT_STATUSES] as const).map((p) => (
            <Chip
              key={p}
              small
              label={p === "all" ? t("All", "সব") : (p === "verified" ? t("Verified", "ভেরিফাইড") : p === "failed" ? t("Failed", "ব্যর্থ") : t("Pending", "পেন্ডিং"))}
              active={paymentFilter === p}
              onClick={() => setPaymentFilter(p)}
            />
          ))}
        </div>
      )}

      {/* Orders Table Shell */}
      <div className="rounded-[24px] border border-white/80 ring-1 ring-slate-200/60 bg-white/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_10px_35px_-10px_rgba(99,102,241,0.08),0_2px_6px_rgba(15,23,42,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-16 grid place-items-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
            <span className="text-xs font-semibold text-slate-500 mt-2">{t("Loading orders...", "অর্ডার লোড হচ্ছে...")}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px] border-collapse">
              <thead className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3.5 w-10"><input type="checkbox" className="rounded accent-violet-600" /></th>
                  <th className="text-left px-3 py-3.5">{t("Order #", "অর্ডার #")}</th>
                  <th className="text-left px-3 py-3.5">{t("Customer", "কাস্টমার")}</th>
                  <th className="text-left px-3 py-3.5">{t("Product", "প্রোডাক্ট")}</th>
                  <th className="text-left px-3 py-3.5">{t("Payment", "পেমেন্ট")}</th>
                  <th className="text-left px-3 py-3.5">{t("Total", "মোট")}</th>
                  <th className="text-left px-3 py-3.5">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="text-left px-3 py-3.5">{t("Date", "তারিখ")}</th>
                  <th className="text-right px-4 py-3.5">{t("Actions", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {filtered.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    onView={() => setSelected(o)}
                    onDelete={() => deleteOrder(o.id)}
                    onDownload={() => downloadReceiptPdf({
                      id: o.id, full_name: o.full_name, email: o.email, phone: o.phone,
                      payment_method: o.payment_method, transaction_id: o.transaction_id,
                      total: Number(o.total), created_at: o.created_at,
                      items: (o.items ?? []).map((it) => ({
                        name: it.name, slug: it.slug ?? "", planPeriod: it.plan ?? "",
                        qty: it.qty ?? 1, price: it.price,
                      })),
                    })}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-14 text-center">
                      <div className="max-w-xs mx-auto text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-700">{t("No orders found", "কোনো অর্ডার পাওয়া যায়নি")}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {t("Click Sync Database to pull in checkout records", "চেকআউট রেকর্ড আনতে ডাটাবেজ সিঙ্ক-এ ক্লিক করুন")}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(s) => updateStatus(selected.id, s)}
          onPaymentStatusChange={(s) => updatePaymentStatus(selected.id, s)}
          onSaveNote={(n) => saveAdminNote(selected.id, n)}
          onDelete={() => deleteOrder(selected.id)}
        />
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onCreated={() => {
            setShowNewOrderModal(false);
            load();
          }}
        />
      )}

      {/* Live Visitor Feed */}
      <LiveVisitorFeed />
    </div>
  );
}

function LiveVisitorFeed() {
  const { t } = useAdminLang();
  const [events, setEvents] = useState<any[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("web_analytics_events")
        .select("id, path, created_at, city, country_name, visitor_id")
        .or("path.ilike.%/checkout%,path.ilike.%/product/%,path.ilike.%q=%")
        .order("created_at", { ascending: false })
        .limit(15);

      if (!error && data) {
        setEvents(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadFeed();
    const int = setInterval(loadFeed, 12000);
    return () => clearInterval(int);
  }, [loadFeed]);

  if (events.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        {t("Live Visitor Feed (Checkout, Products, Search)", "লাইভ ভিজিটর ফিড (চেকআউট, প্রোডাক্ট, সার্চ)")}
      </h3>
      <div className="rounded-[22px] border border-white/80 ring-1 ring-slate-200/60 bg-white/95 backdrop-blur-xl shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/70 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3">{t("Time", "সময়")}</th>
              <th className="text-left px-4 py-3">{t("Location", "স্থান")}</th>
              <th className="text-left px-4 py-3">{t("Action / Path", "অ্যাকশন / পাথ")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
                  {new Date(e.created_at).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                  {e.city ? `${e.city}, ` : ""}{e.country_name || "Unknown"}
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-violet-700 truncate max-w-[420px] inline-block font-semibold">
                    {e.path}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  tone: "violet" | "amber" | "sky" | "emerald";
  loading?: boolean;
}) {
  const configs = {
    violet: {
      cardBg: "from-violet-50/70 via-white to-white",
      ring: "ring-violet-200/60",
      border: "border-violet-100/80",
      iconGrad: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
      shadow: "shadow-[0_8px_24px_-6px_rgba(124,58,237,0.12)]",
      iconShadow: "0 8px 18px -4px rgba(124,58,237,0.4)",
    },
    amber: {
      cardBg: "from-amber-50/70 via-white to-white",
      ring: "ring-amber-200/60",
      border: "border-amber-100/80",
      iconGrad: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      shadow: "shadow-[0_8px_24px_-6px_rgba(245,158,11,0.12)]",
      iconShadow: "0 8px 18px -4px rgba(245,158,11,0.4)",
    },
    sky: {
      cardBg: "from-sky-50/70 via-white to-white",
      ring: "ring-sky-200/60",
      border: "border-sky-100/80",
      iconGrad: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
      shadow: "shadow-[0_8px_24px_-6px_rgba(14,165,233,0.12)]",
      iconShadow: "0 8px 18px -4px rgba(14,165,233,0.4)",
    },
    emerald: {
      cardBg: "from-emerald-50/70 via-white to-white",
      ring: "ring-emerald-200/60",
      border: "border-emerald-100/80",
      iconGrad: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      shadow: "shadow-[0_8px_24px_-6px_rgba(16,185,129,0.12)]",
      iconShadow: "0 8px 18px -4px rgba(16,185,129,0.4)",
    },
  };
  const cfg = configs[tone] || configs.violet;

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] p-5 border ${cfg.border} ring-1 ${cfg.ring} bg-gradient-to-br ${cfg.cardBg} backdrop-blur-xl ${cfg.shadow} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</div>
        <span
          className="w-10 h-10 rounded-2xl grid place-items-center text-white ring-1 ring-white/50"
          style={{ background: cfg.iconGrad, boxShadow: `${cfg.iconShadow}, inset 0 1px 0 rgba(255,255,255,0.3)` }}
        >
          {icon}
        </span>
      </div>
      <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5 tracking-tight tabular-nums">
        {loading ? "…" : value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 font-semibold mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
  small,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 transition-all duration-150 rounded-full font-bold text-xs select-none cursor-pointer ${
        small ? "h-8 px-3 text-[11px]" : "h-9 px-3.5"
      } ${
        active
          ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.35)] ring-1 ring-violet-400/40"
          : "bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-violet-300 shadow-xs"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`inline-grid place-items-center rounded-full text-[11px] px-1.5 py-0.2 min-w-[20px] font-extrabold ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useAdminLang();
  const styles: Record<string, { bg: string; text: string; border: string; label: [string, string] }> = {
    pending:    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: ["Pending", "পেন্ডিং"] },
    processing: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: ["Processing", "প্রসেসিং"] },
    delivered:  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", label: ["Delivered", "ডেলিভার্ড"] },
    completed:  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: ["Completed", "সম্পন্ন"] },
    cancelled:  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: ["Cancelled", "বাতিল"] },
    refunded:   { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: ["Refunded", "রিফান্ড"] },
    failed:     { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: ["Failed", "ব্যর্থ"] },
  };
  const conf = styles[status] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: [status, status] };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${conf.bg} ${conf.text} ${conf.border} shadow-2xs`}>
      {t(conf.label[0], conf.label[1])}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="text-slate-400 hover:text-violet-600 transition"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function OrderRow({
  order: o,
  onView,
  onDelete,
  onDownload,
}: {
  order: Order;
  onView: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const { t } = useAdminLang();
  const firstItem = o.items?.[0];
  const verified = (o.payment_status || "pending") === "verified";
  const waLink = waChatUrl(o.phone);

  return (
    <tr className="hover:bg-violet-50/30 transition-colors">
      <td className="px-4 py-3"><input type="checkbox" className="rounded accent-violet-600" /></td>
      <td className="px-3 py-3">
        <button onClick={onView} className="text-violet-700 font-bold font-mono text-xs hover:underline cursor-pointer">
          {shortId(o.id)}
        </button>
        <div className="flex items-center gap-1 mt-1">
          {verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t("Verified", "ভেরিফাইড")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200/80 px-1.5 py-0.2 rounded font-medium">
              <AlertCircle className="w-3 h-3 text-slate-400" /> {t("Unverified", "আনভেরিফাইড")}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="font-bold text-slate-900 text-sm">{o.full_name || "—"}</div>
        <div className="text-xs text-slate-500 truncate max-w-[200px]">{o.email || "—"}</div>
        <div className="text-xs text-slate-500 font-mono">{o.phone || "—"}</div>
      </td>
      <td className="px-3 py-3 text-slate-700 text-sm max-w-[240px]">
        <div className="truncate font-medium text-slate-800" title={firstItem?.name}>
          {firstItem?.name || "—"}
        </div>
        {firstItem?.plan && <div className="text-[11px] text-violet-600 font-semibold">{firstItem.plan}</div>}
        {o.items?.length > 1 && (
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
            +{o.items.length - 1} {t("more items", "অন্যান্য পণ্য")}
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="font-bold text-slate-900 text-xs capitalize flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
          {o.payment_method || "manual"}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
          <span className="truncate max-w-[110px]">{o.transaction_id || "—"}</span>
          {o.transaction_id && <CopyButton text={o.transaction_id} />}
        </div>
      </td>
      <td className="px-3 py-3 font-black text-slate-900 text-sm tabular-nums">
        {fmtMoney(Number(o.total))}
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={o.status} />
      </td>
      <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">
        <div className="font-medium text-slate-700">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
        <div className="text-[11px] text-slate-400">{new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <IconBtn title={t("Download PDF", "PDF ডাউনলোড")} onClick={onDownload} tone="sky">
            <Download className="w-3.5 h-3.5" />
          </IconBtn>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              title="WhatsApp"
              className="w-8 h-8 rounded-xl grid place-items-center bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          <IconBtn title={t("View", "দেখুন")} onClick={onView} tone="violet">
            <Eye className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title={t("Edit", "এডিট")} onClick={onView} tone="indigo">
            <Pencil className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title={t("Delete", "ডিলিট")} onClick={onDelete} tone="rose">
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  tone = "violet",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "sky" | "violet" | "indigo" | "rose" | "emerald";
}) {
  const styles = {
    sky: "bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100",
    violet: "bg-violet-50 text-violet-700 border-violet-200/80 hover:bg-violet-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-xl grid place-items-center border transition shadow-xs cursor-pointer ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

function OrderDetail({
  order,
  onClose,
  onStatusChange,
  onPaymentStatusChange,
  onSaveNote,
  onDelete,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (s: string) => void;
  onPaymentStatusChange: (s: string) => void;
  onSaveNote: (note: string) => void;
  onDelete: () => void;
}) {
  const { t } = useAdminLang();
  const [tab, setTab] = useState<"details" | "history">("details");
  const [waMsg, setWaMsg] = useState("");
  const [note, setNote] = useState(order.admin_note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const discount = useMemo(() => {
    const sum = (order.items ?? []).reduce((a, it) => a + Number(it.price) * (it.qty ?? 1), 0);
    return Math.max(0, sum - Number(order.total));
  }, [order]);

  const waLink = waChatUrl(order.phone, waMsg || undefined);

  const downloadReceipt = async () => {
    setDownloading(true);
    try {
      downloadReceiptPdf({
        id: order.id,
        full_name: order.full_name,
        email: order.email,
        phone: order.phone,
        payment_method: order.payment_method,
        transaction_id: order.transaction_id,
        total: Number(order.total),
        created_at: order.created_at,
        items: (order.items ?? []).map((it) => ({
          name: it.name,
          slug: it.slug ?? "",
          planPeriod: it.plan ?? "",
          qty: it.qty ?? 1,
          price: it.price,
        })),
      });
      toast.success(t("Receipt downloaded", "রিসিপ্ট ডাউনলোড হয়েছে"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to download receipt");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-3 sm:p-5 overflow-y-auto" onClick={onClose}>
      <div
        className="rounded-[28px] border border-white/90 ring-1 ring-slate-200/70 bg-white shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-black text-xl text-slate-900 tracking-tight">
              {t("Order", "অর্ডার")} #{shortId(order.id)}
            </h2>
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-500 font-mono tabular-nums">{new Date(order.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadReceipt}
              disabled={downloading}
              className="w-9 h-9 grid place-items-center rounded-xl text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition border border-slate-200/80 shadow-xs"
              title={t("Download Receipt PDF", "রিসিপ্ট PDF ডাউনলোড")}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin text-violet-600" /> : <FileText className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100/70 p-1 rounded-2xl">
            <button
              onClick={() => setTab("details")}
              className={`h-9 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${
                tab === "details" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> {t("Details", "বিবরণ")}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`h-9 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${
                tab === "history" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600"
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" /> {t("History", "ইতিহাস")}
            </button>
          </div>
        </div>

        {tab === "details" ? (
          <div className="p-6 space-y-4">
            {/* Customer + Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Card title={t("Customer Information", "গ্রাহকের তথ্য")} icon={<UserIcon className="w-4 h-4" />}>
                <div className="font-black text-slate-900 text-base">{order.full_name || "—"}</div>
                <div className="mt-2.5 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{order.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.phone || "—"}</span>
                  </div>
                </div>
              </Card>

              <Card title={t("Payment Details", "পেমেন্ট বিবরণ")} icon={<CreditCard className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <Row label={t("Method", "মাধ্যম")} value={<span className="font-bold text-slate-900 capitalize">{order.payment_method}</span>} />
                  <Row label="TrxID:" value={<span className="font-mono text-xs font-bold text-violet-700">{order.transaction_id || "—"}</span>} />
                  <Row label={t("Payment Status", "পেমেন্ট স্ট্যাটাস")} value={<span className="font-bold text-emerald-600 capitalize">{(order.payment_status || "pending")}</span>} />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <Row label={t("Total Amount:", "মোট মূল্য:")} value={<span className="font-black text-lg text-slate-900">{fmtMoney(Number(order.total))}</span>} />
                  {discount > 0 && <Row label={t("Discount:", "ছাড়:")} value={<span className="font-bold text-rose-600">-{fmtMoney(discount)}</span>} />}
                </div>
              </Card>
            </div>

            {/* Products List */}
            <Card title={t("Purchased Items", "ক্রয়কৃত পণ্যসমূহ")} icon={<Package className="w-4 h-4" />}>
              <div className="divide-y divide-slate-100">
                {(order.items ?? []).map((it, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                      {it.plan && <div className="text-xs text-violet-600 font-semibold">{it.plan}</div>}
                      <div className="text-[11px] text-slate-400">Qty: {it.qty ?? 1}</div>
                    </div>
                    <div className="text-sm font-black text-slate-900 tabular-nums">
                      {fmtMoney(Number(it.price) * (it.qty ?? 1))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick action buttons */}
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                {t("Quick Actions", "দ্রুত অ্যাকশন")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={waLink || "#"}
                  target={waLink ? "_blank" : undefined}
                  rel="noreferrer"
                  className={`h-10 rounded-xl border inline-flex items-center justify-center gap-2 text-xs font-bold transition shadow-xs ${
                    waLink ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button
                  onClick={downloadReceipt}
                  disabled={downloading}
                  className="h-10 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 inline-flex items-center justify-center gap-2 text-xs font-bold transition shadow-xs"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t("PDF Receipt", "PDF রিসিপ্ট")}
                </button>
                <button
                  onClick={() => onStatusChange("cancelled")}
                  className="h-10 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 inline-flex items-center justify-center gap-2 text-xs font-bold transition shadow-xs"
                >
                  <XIcon className="w-4 h-4" /> {t("Cancel Order", "অর্ডার বাতিল")}
                </button>
              </div>
            </div>

            {/* Status Change Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block uppercase tracking-wide">
                  {t("Order Status", "অর্ডার স্ট্যাটাস")}
                </label>
                <select
                  value={order.status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200/90 px-3.5 text-sm bg-white font-semibold text-slate-800 capitalize focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none shadow-xs"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block uppercase tracking-wide">
                  {t("Payment Status", "পেমেন্ট স্ট্যাটাস")}
                </label>
                <select
                  value={order.payment_status || "pending"}
                  onChange={(e) => onPaymentStatusChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200/90 px-3.5 text-sm bg-white font-semibold text-slate-800 capitalize focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none shadow-xs"
                >
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Custom WhatsApp message */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block uppercase tracking-wide">
                {t("WhatsApp Delivery Message", "WhatsApp ডেলিভারি মেসেজ")}
              </label>
              <textarea
                value={waMsg}
                onChange={(e) => setWaMsg(e.target.value)}
                rows={3}
                placeholder={t("License key, login details, or delivery notes...", "লাইসেন্স কি, লগইন বিবরণ বা ডেলিভারি নোট...")}
                className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none resize-none shadow-xs"
              />
            </div>

            {/* Admin Internal Notes */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block uppercase tracking-wide">
                {t("Internal Admin Notes", "ইন্টারনাল অ্যাডমিন নোট")}
              </label>
              <div className="flex gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t("Private notes visible only to admins...", "অ্যাডমিনের জন্য অভ্যন্তরীণ নোট...")}
                  className="flex-1 rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none resize-none shadow-xs"
                />
                <button
                  onClick={async () => {
                    setSavingNote(true);
                    await onSaveNote(note);
                    setSavingNote(false);
                  }}
                  disabled={savingNote}
                  className="self-start px-4 h-10 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-60 transition shadow-xs"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Save", "সেভ")}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">{t("Permanent deletion cannot be undone", "ডিলিট করলে তথ্য আর পুনরুদ্ধার করা যাবে না")}</span>
              <button
                onClick={onDelete}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t("Delete Order", "অর্ডার ডিলিট করুন")}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            <HistoryRow icon={<Plus className="w-4 h-4" />} label={t("Order Placed", "অর্ডার সম্পন্ন হয়েছে")} time={order.created_at} />
            {order.whatsapp_sent && (
              <HistoryRow icon={<MessageCircle className="w-4 h-4" />} label={t("WhatsApp notification sent", "WhatsApp নোটিফিকেশন পাঠানো হয়েছে")} time={order.created_at} />
            )}
            <HistoryRow icon={<ShieldCheck className="w-4 h-4" />} label={t(`Current status: ${order.status}`, `বর্তমান স্ট্যাটাস: ${order.status}`)} />
          </div>
        )}
      </div>
    </div>
  );
}

function NewOrderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useAdminLang();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    productName: "",
    plan: "1 Month",
    price: 300,
    qty: 1,
    paymentMethod: "bKash",
    trxId: "",
    status: "processing",
    paymentStatus: "verified",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.productName) {
      toast.error(t("Please fill customer name, phone and product name", "কাস্টমার নাম, ফোন এবং প্রোডাক্টের নাম পূরণ করুন"));
      return;
    }

    setBusy(true);
    try {
      const { createAdminOrder } = await import("@/lib/orders.functions");
      await createAdminOrder({
        data: {
          full_name: form.name,
          phone: form.phone,
          email: form.email || `${form.phone}@manual.local`,
          payment_method: form.paymentMethod,
          transaction_id: form.trxId || `ORD-${Date.now().toString().slice(-6)}`,
          items: [
            {
              name: form.productName,
              plan: form.plan,
              price: Number(form.price),
              qty: Number(form.qty || 1),
            },
          ],
          total: Number(form.price) * Number(form.qty || 1),
          status: form.status,
          payment_status: form.paymentStatus,
          admin_note: form.note || "Created manually from Admin Console",
        },
      });

      toast.success(t("Order created successfully", "অর্ডার সফলভাবে তৈরি হয়েছে"));
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-3 sm:p-5 overflow-y-auto" onClick={onClose}>
      <div
        className="rounded-[28px] border border-white/90 ring-1 ring-slate-200/70 bg-white shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 grid place-items-center font-bold">
              <Plus className="w-4 h-4 stroke-[3]" />
            </span>
            <h2 className="font-black text-lg text-slate-900">{t("Create New Order", "নতুন অর্ডার যোগ করুন")}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Customer Name", "কাস্টমার নাম")} *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mahbub Alam"
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm focus:border-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Phone Number", "ফোন নম্বর")} *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="017XXXXXXXX"
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm font-mono focus:border-violet-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Customer Email (Optional)", "ইমেইল (ঐচ্ছিক)")}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="customer@gmail.com"
              className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm focus:border-violet-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Product / Subscription", "প্রোডাক্ট বা সেবা")} *</label>
              <input
                required
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                placeholder="Canva Pro / Netflix / CapCut"
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm focus:border-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Plan / Period", "প্ল্যান")}</label>
              <input
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                placeholder="1 Month"
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm focus:border-violet-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Price (BDT)", "মূল্য (টাকা)")} *</label>
              <input
                type="number"
                required
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm font-bold tabular-nums focus:border-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Quantity", "পরিমাণ")}</label>
              <input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm font-bold tabular-nums focus:border-violet-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Payment Method", "পেমেন্ট মাধ্যম")}</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm bg-white font-medium focus:border-violet-400 outline-none"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Transaction ID", "TrxID")}</label>
              <input
                value={form.trxId}
                onChange={(e) => setForm({ ...form, trxId: e.target.value })}
                placeholder="DG481WD..."
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm font-mono focus:border-violet-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Initial Status", "স্ট্যাটাস")}</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm bg-white font-medium focus:border-violet-400 outline-none capitalize"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Payment Status", "পেমেন্ট স্ট্যাটাস")}</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm bg-white font-medium focus:border-violet-400 outline-none capitalize"
              >
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">{t("Note", "নোট")}</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Ordered via WhatsApp"
              className="w-full h-10 rounded-xl border border-slate-200/90 px-3 text-sm focus:border-violet-400 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
            >
              {t("Cancel", "বাতিল")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 h-10 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t("Save Order", "অর্ডার সেভ করুন")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 uppercase tracking-wide mb-2.5">
        <span className="text-violet-600">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function HistoryRow({ icon, label, time }: { icon: React.ReactNode; label: string; time?: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
      <span className="w-8 h-8 grid place-items-center rounded-xl bg-white text-violet-600 border border-slate-200/80 shadow-2xs">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {time && <div className="text-xs text-slate-400 font-mono mt-0.5">{new Date(time).toLocaleString()}</div>}
      </div>
    </div>
  );
}
