import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Eye, X, Download, Trash2, Plus, RefreshCw, MessageCircle,
  Pencil, Filter as FilterIcon, Search as SearchIcon, ShieldCheck,
  User as UserIcon, Mail, Phone, CreditCard, Package, FileText,
  Copy, Check, History as HistoryIcon, AlertCircle, X as XIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadReceiptPdf } from "@/lib/receipt";
import { sendTransactionalEmail } from "@/lib/email/send";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type OrderItem = { name: string; plan?: string; price: number; qty?: number; slug?: string };
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
  delivered_credentials?: { plan?: string; loginEmail?: string; loginPassword?: string; startsOn?: string; expiresOn?: string } | null;
};

const STATUSES = ["pending", "processing", "delivered", "completed", "cancelled", "refunded", "failed"] as const;
const PAYMENT_STATUSES = ["pending", "verified", "failed"] as const;

const shortId = (id: string) => "ORD-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();

const fmtMoney = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");

function AdminOrders() {
  const { t } = useAdminLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const target = orders.find((o) => o.id === id);
    const prev = orders;
    setOrders((o) => o.map((x) => x.id === id ? { ...x, status } : x));
    setSelected((s) => s && s.id === id ? { ...s, status } : s);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { setOrders(prev); toast.error(error.message); return; }
    toast.success(t(`Status updated to ${status}`, `স্ট্যাটাস আপডেট: ${status}`));
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
            manageUrl: "https://accessnowbd.com/orders",
          },
        }).catch(() => {});
      } else {
        sendTransactionalEmail({
          templateName: "order-status-update",
          recipientEmail: target.email,
          idempotencyKey: `order-status-${id}-${status}`,
          templateData: { name: firstName, orderId: sid, status, orderUrl: "https://accessnowbd.com/orders" },
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
    <div className="space-y-4 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm">
            <span className="font-bold text-slate-900">{orders.length}</span>
            <span className="text-slate-500"> {t("total orders", "মোট অর্ডার")}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
            <MessageCircle className="w-3.5 h-3.5" /> {t("WhatsApp Active", "WhatsApp সক্রিয়")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("cancelled")}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("Trash", "ট্র্যাশ")}
          </button>
          <button
            onClick={() => toast.info(t("Use Quick Tools to add a manual order", "ম্যানুয়াল অর্ডার যোগ করতে Quick Tools ব্যবহার করুন"))}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
          >
            <Plus className="w-3.5 h-3.5" /> {t("New Order", "নতুন অর্ডার")}
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("Total Revenue", "মোট রেভিনিউ")} value={fmtMoney(totalRev)} icon={<CreditCard className="w-4 h-4" />} tone="violet" loading={loading} />
        <StatCard label={t("Pending", "পেন্ডিং")} value={pendingCount} icon={<AlertCircle className="w-4 h-4" />} tone="amber" loading={loading} />
        <StatCard label={t("Processing", "প্রসেসিং")} value={processingCount} icon={<RefreshCw className="w-4 h-4" />} tone="sky" loading={loading} />
        <StatCard label={t("Completed", "সম্পন্ন")} value={completedCount} icon={<ShieldCheck className="w-4 h-4" />} tone="emerald" loading={loading} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Chip label={`${sLabel("all")} ${orders.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
        {(["pending","processing","delivered","completed","cancelled","refunded","failed"] as const).map((s) => (
          <Chip key={s} label={`${sLabel(s)} ${counts[s] ?? 0}`} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 px-3 h-10 rounded-xl bg-slate-50 border border-slate-100">
          <SearchIcon className="w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Order ID, name, email, TrxID…", "অর্ডার ID, নাম, ইমেইল, TrxID...")}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-semibold ${showFilters ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          <FilterIcon className="w-3.5 h-3.5" /> {t("Filter", "ফিল্টার")}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1">{t("Payment", "পেমেন্ট")}:</span>
          {(["all", ...PAYMENT_STATUSES] as const).map((p) => (
            <Chip key={p} small label={p === "all" ? t("All", "সব") : (p === "verified" ? t("Verified", "ভেরিফাইড") : p === "failed" ? t("Failed", "ব্যর্থ") : t("Pending", "পেন্ডিং"))} active={paymentFilter === p} onClick={() => setPaymentFilter(p)} />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 w-10"><input type="checkbox" className="rounded" /></th>
                  <th className="text-left px-3 py-3">{t("Order #", "অর্ডার #")}</th>
                  <th className="text-left px-3 py-3">{t("Customer", "কাস্টমার")}</th>
                  <th className="text-left px-3 py-3">{t("Product", "প্রোডাক্ট")}</th>
                  <th className="text-left px-3 py-3">{t("Payment", "পেমেন্ট")}</th>
                  <th className="text-left px-3 py-3">{t("Total", "মোট")}</th>
                  <th className="text-left px-3 py-3">{t("Status", "স্ট্যাটাস")}</th>
                  <th className="text-left px-3 py-3">{t("Date", "তারিখ")}</th>
                  <th className="text-right px-4 py-3">{t("Actions", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody>
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
                  <tr><td colSpan={9} className="p-10 text-center text-slate-400">{t("No orders found.", "কোনো অর্ডার পাওয়া যায়নি।")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}

function StatCard({ label, value, icon, tone, loading }: { label: string; value: string | number; icon: React.ReactNode; tone: "violet"|"amber"|"sky"|"emerald"; loading?: boolean }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <span className={`w-7 h-7 rounded-lg grid place-items-center ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {loading ? "…" : value}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? "px-2.5 h-7 text-[11px]" : "px-3.5 h-8 text-xs"} rounded-full font-semibold transition border ${active ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useAdminLang();
  const m: Record<string, { cls: string; en: string; bn: string }> = {
    pending:    { cls: "bg-amber-100 text-amber-800 border-amber-300", en: "Pending", bn: "পেন্ডিং" },
    processing: { cls: "bg-sky-100 text-sky-800 border-sky-300", en: "Processing", bn: "প্রসেসিং" },
    delivered:  { cls: "bg-violet-100 text-violet-800 border-violet-300", en: "Delivered", bn: "ডেলিভার্ড" },
    completed:  { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", en: "Completed", bn: "সম্পন্ন" },
    cancelled:  { cls: "bg-rose-100 text-rose-800 border-rose-300", en: "Cancelled", bn: "বাতিল" },
    refunded:   { cls: "bg-slate-200 text-slate-800 border-slate-300", en: "Refunded", bn: "রিফান্ড" },
    failed:     { cls: "bg-red-100 text-red-800 border-red-300", en: "Failed", bn: "ব্যর্থ" },
  };
  const v = m[status] || { cls: "bg-slate-200 text-slate-800 border-slate-300", en: status, bn: status };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${v.cls}`}>
      {t(v.en, v.bn)}
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
        setCopied(true); setTimeout(() => setCopied(false), 1200);
      }}
      className="text-slate-400 hover:text-violet-600"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function OrderRow({ order: o, onView, onDelete, onDownload }: { order: Order; onView: () => void; onDelete: () => void; onDownload: () => void }) {
  const { t } = useAdminLang();
  const firstItem = o.items?.[0];
  const verified = (o.payment_status || "pending") === "verified";
  const waLink = o.phone ? `https://wa.me/${o.phone.replace(/\D/g, "")}` : "";
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60">
      <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
      <td className="px-3 py-3">
        <button onClick={onView} className="text-violet-600 font-semibold font-mono text-xs hover:underline">{shortId(o.id)}</button>
        <div className="flex items-center gap-1 mt-1">
          {verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3 h-3" /> {t("Verified", "ভেরিফাইড")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
              <AlertCircle className="w-3 h-3" /> {t("Unverified", "আনভেরিফাইড")}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="font-semibold text-slate-900 text-sm">{o.full_name}</div>
        <div className="text-xs text-slate-500">{o.email}</div>
        <div className="text-xs text-slate-500">{o.phone}</div>
      </td>
      <td className="px-3 py-3 text-slate-700 text-sm max-w-[260px]">
        <div className="truncate" title={firstItem?.name}>{firstItem?.name || "—"}</div>
        {o.items?.length > 1 && <div className="text-[11px] text-slate-400">+{o.items.length - 1} {t("more", "আরও")}</div>}
      </td>
      <td className="px-3 py-3">
        <div className="font-semibold text-slate-900 text-sm capitalize">{o.payment_method}</div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <span className="truncate max-w-[100px]">{o.transaction_id || "—"}</span>
          {o.transaction_id && <CopyButton text={o.transaction_id} />}
        </div>
      </td>
      <td className="px-3 py-3 font-bold text-slate-900">{fmtMoney(Number(o.total))}</td>
      <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
      <td className="px-3 py-3 text-xs text-slate-500">
        <div>{new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
        <div>{new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <IconBtn title={t("Download PDF", "PDF ডাউনলোড")} onClick={onDownload} tone="sky"><Download className="w-4 h-4" /></IconBtn>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp"
              className="w-8 h-8 grid place-items-center rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          <IconBtn title={t("View", "দেখুন")} onClick={onView} tone="indigo"><Eye className="w-4 h-4" /></IconBtn>
          <IconBtn title={t("Edit", "এডিট")} onClick={onView} tone="amber"><Pencil className="w-4 h-4" /></IconBtn>
          <IconBtn title={t("Delete", "ডিলিট")} onClick={onDelete} tone="rose"><Trash2 className="w-4 h-4" /></IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ children, onClick, title, tone = "slate" }: { children: React.ReactNode; onClick: () => void; title: string; tone?: "sky" | "indigo" | "amber" | "rose" | "slate" }) {
  const tones: Record<string, string> = {
    sky: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 grid place-items-center rounded-md border transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function OrderDetail({ order, onClose, onStatusChange, onPaymentStatusChange, onSaveNote, onDelete }: {
  order: Order;
  onClose: () => void;
  onStatusChange: (s: string) => void;
  onPaymentStatusChange: (s: string) => void;
  onSaveNote: (note: string) => void;
  onDelete: () => void;
}) {
  const { t } = useAdminLang();
  const [tab, setTab] = useState<"details"|"history">("details");
  const [waMsg, setWaMsg] = useState("");
  const [note, setNote] = useState(order.admin_note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const discount = useMemo(() => {
    const sum = (order.items ?? []).reduce((a, it) => a + Number(it.price) * (it.qty ?? 1), 0);
    return Math.max(0, sum - Number(order.total));
  }, [order]);

  const waLink = order.phone
    ? `https://wa.me/${order.phone.replace(/\D/g, "")}${waMsg ? `?text=${encodeURIComponent(waMsg)}` : ""}`
    : "";

  const downloadReceipt = async () => {
    setDownloading(true);
    try {
      downloadReceiptPdf({
        id: order.id, full_name: order.full_name, email: order.email, phone: order.phone,
        payment_method: order.payment_method, transaction_id: order.transaction_id,
        total: Number(order.total), created_at: order.created_at,
        items: (order.items ?? []).map((it) => ({
          name: it.name, slug: it.slug ?? "", planPeriod: it.plan ?? "",
          qty: it.qty ?? 1, price: it.price,
        })),
      });
      toast.success(t("Receipt downloaded", "রিসিপ্ট ডাউনলোড হয়েছে"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-extrabold text-lg text-slate-900">{t("Order", "অর্ডার")} #{shortId(order.id)}</h2>
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={downloadReceipt} disabled={downloading} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
            <button onClick={() => setTab("details")} className={`h-9 rounded-lg text-sm font-semibold transition inline-flex items-center justify-center gap-1.5 ${tab === "details" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
              <FileText className="w-4 h-4" /> {t("Details", "বিবরণ")}
            </button>
            <button onClick={() => setTab("history")} className={`h-9 rounded-lg text-sm font-semibold transition inline-flex items-center justify-center gap-1.5 ${tab === "history" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
              <HistoryIcon className="w-4 h-4" /> {t("History", "ইতিহাস")}
            </button>
          </div>
        </div>

        {tab === "details" ? (
          <div className="p-5 space-y-4">
            {/* Customer + Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title={t("Customer", "কাস্টমার")} icon={<UserIcon className="w-3.5 h-3.5" />}>
                <div className="font-bold text-slate-900">{order.full_name}</div>
                <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" />{order.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" />{order.phone}</div>
                </div>
              </Card>
              <Card title={t("Payment", "পেমেন্ট")} icon={<CreditCard className="w-3.5 h-3.5" />}>
                <div className="space-y-1.5 text-sm">
                  <Row label={t("Method", "মাধ্যম")} value={<span className="font-bold text-slate-900">{order.payment_method}</span>} />
                  <Row label="TrxID:" value={<span className="font-mono text-xs text-slate-700">{order.transaction_id}</span>} />
                  <Row label={t("Payment:", "পেমেন্ট:")} value={<span className="font-semibold text-emerald-600">{(order.payment_status || "pending")}</span>} />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <Row label={t("Total:", "মোট:")} value={<span className="font-bold text-violet-700">{fmtMoney(Number(order.total))}</span>} />
                  {discount > 0 && <Row label={t("Discount:", "ছাড়:")} value={<span className="font-semibold text-rose-600">-{fmtMoney(discount)}</span>} />}
                </div>
              </Card>
            </div>

            {/* Products */}
            <Card title={t("Products", "পণ্যসমূহ")} icon={<Package className="w-3.5 h-3.5" />}>
              <div className="divide-y divide-slate-100">
                {(order.items ?? []).map((it, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-slate-900">{it.name}</span>
                      {it.plan && <span className="text-xs text-slate-500 ml-1">({it.plan})</span>}
                      <span className="text-xs text-slate-400 ml-1.5">×{it.qty ?? 1}</span>
                    </div>
                    <div className="text-sm font-bold text-violet-700">{fmtMoney(Number(it.price) * (it.qty ?? 1))}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick actions */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t("Quick Actions", "দ্রুত অ্যাকশন")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a href={waLink || "#"} target={waLink ? "_blank" : undefined} rel="noreferrer"
                   className={`h-10 rounded-xl border inline-flex items-center justify-center gap-2 text-sm font-semibold ${waLink ? "border-emerald-200 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50" : "border-slate-200 text-slate-400 cursor-not-allowed"}`}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={downloadReceipt} disabled={downloading}
                   className="h-10 rounded-xl border border-violet-200 text-violet-700 bg-violet-50/40 hover:bg-violet-50 inline-flex items-center justify-center gap-2 text-sm font-semibold">
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t("PDF Download", "PDF ডাউনলোড")}
                </button>
                <button onClick={() => { onStatusChange("cancelled"); }}
                   className="h-10 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/40 hover:bg-rose-50 inline-flex items-center justify-center gap-2 text-sm font-semibold">
                  <XIcon className="w-4 h-4" /> {t("Cancel", "বাতিল")}
                </button>
              </div>
            </div>

            {/* Status selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("Order Status", "Status পরিবর্তন")}</label>
                <select value={order.status} onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white capitalize focus:border-violet-400 outline-none">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("Payment Status", "পেমেন্ট স্ট্যাটাস")}</label>
                <select value={order.payment_status || "pending"} onChange={(e) => onPaymentStatusChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white capitalize focus:border-violet-400 outline-none">
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* WhatsApp custom message */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("WhatsApp Custom Message (optional)", "WhatsApp কাস্টম মেসেজ (ঐচ্ছিক)")}</label>
              <textarea
                value={waMsg} onChange={(e) => setWaMsg(e.target.value)}
                rows={3}
                placeholder={t("License key, delivery instructions…", "লাইসেন্স কি, ডেলিভারি নির্দেশনা...")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 outline-none resize-none"
              />
            </div>

            {/* Admin notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("Admin Notes (Internal)", "Admin Notes (Internal)")}</label>
              <div className="flex gap-2">
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t("Internal notes…", "ইন্টারনাল নোট...")}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 outline-none resize-none"
                />
                <button
                  onClick={async () => { setSavingNote(true); await onSaveNote(note); setSavingNote(false); }}
                  disabled={savingNote}
                  className="self-start px-4 h-10 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Save", "সেভ")}
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="pt-3 border-t border-slate-100">
              <button onClick={onDelete} className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> {t("Delete this order", "এই অর্ডার ডিলিট করুন")}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="space-y-2">
              <HistoryRow icon={<Plus className="w-3.5 h-3.5" />} label={t("Order created", "অর্ডার তৈরি হয়েছে")} time={order.created_at} />
              {order.whatsapp_sent && (
                <HistoryRow icon={<MessageCircle className="w-3.5 h-3.5" />} label={t("WhatsApp notification sent", "WhatsApp নোটিফিকেশন পাঠানো হয়েছে")} time={order.created_at} />
              )}
              <HistoryRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label={t(`Current status: ${order.status}`, `বর্তমান স্ট্যাটাস: ${order.status}`)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
        <span className="text-violet-600">{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function HistoryRow({ icon, label, time }: { icon: React.ReactNode; label: string; time?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
      <span className="w-7 h-7 grid place-items-center rounded-lg bg-white text-violet-600 border border-slate-200">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        {time && <div className="text-xs text-slate-500">{new Date(time).toLocaleString()}</div>}
      </div>
    </div>
  );
}
