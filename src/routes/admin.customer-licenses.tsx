import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyRound, Search, RefreshCw, Mail, FileText, Download, Pencil, Send,
  Trash2, Plus, Loader2, X, ShoppingCart, TrendingUp, CreditCard, ScanLine,
  Package, CalendarClock, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customer-licenses")({
  component: CustomerLicensesPage,
});

type OrderItem = {
  qty?: number;
  name?: string;
  slug?: string;
  emoji?: string;
  price?: number;
  planPeriod?: string;
};

type DeliveredItem = {
  key?: string;
  type?: string;
  expiry?: string; // ISO date or "lifetime"
  delivered_via?: "whatsapp" | "email" | "manual" | "";
};

type DeliveredCreds = { items?: DeliveredItem[] } | null;

type OrderRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  items: OrderItem[];
  delivered_credentials: DeliveredCreds;
  created_at: string;
};

type Customer = {
  email: string;
  name: string;
  phone: string;
  orders: OrderRow[];
};

const STATUS_OPTS = ["pending", "processing", "completed", "refunded", "cancelled"];

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

function invoiceCode(o: OrderRow) {
  const d = new Date(o.created_at);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${o.id.slice(0, 4).toUpperCase()}`;
}

function badgePay(s: string) {
  const k = (s || "").toLowerCase();
  if (k === "paid") return "bg-violet-500 text-white";
  if (k === "pending") return "bg-amber-100 text-amber-700";
  if (k === "failed") return "bg-rose-100 text-rose-700";
  return "bg-slate-200 text-slate-700";
}

function CustomerLicensesPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<{ orderId: string; idx: number; item: OrderItem; current: DeliveredItem } | null>(null);
  const [adding, setAdding] = useState<{ order: OrderRow } | null>(null);

  const search = useCallback(async (silent = false) => {
    const term = q.trim();
    if (!term) {
      toast.error("Type a customer email, phone or name");
      return;
    }
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,email,full_name,phone,status,payment_status,payment_method,total,items,delivered_credentials,created_at")
      .or(`email.ilike.%${term}%,phone.ilike.%${term}%,full_name.ilike.%${term}%`)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as unknown as OrderRow[];
    if (rows.length === 0) { setCustomer(null); toast.error("No orders found"); return; }
    const first = rows[0];
    setCustomer({
      email: first.email,
      name: first.full_name,
      phone: first.phone,
      orders: rows,
    });
  }, [q]);

  const refresh = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,email,full_name,phone,status,payment_status,payment_method,total,items,delivered_credentials,created_at")
      .eq("email", customer.email)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as unknown as OrderRow[];
    setCustomer({ ...customer, orders: rows });
    toast.success("Refreshed");
  }, [customer]);

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    if (customer) {
      setCustomer({ ...customer, orders: customer.orders.map(o => o.id === orderId ? { ...o, status } : o) });
    }
    toast.success("Status updated");
  };

  const saveDelivered = async (orderId: string, idx: number, patch: DeliveredItem) => {
    if (!customer) return;
    const order = customer.orders.find(o => o.id === orderId);
    if (!order) return;
    const items = Array.isArray(order.delivered_credentials?.items) ? [...order.delivered_credentials!.items!] : [];
    while (items.length <= idx) items.push({});
    items[idx] = { ...items[idx], ...patch };
    const next = { items };
    const { error } = await supabase
      .from("orders")
      .update({ delivered_credentials: next, delivered_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    setCustomer({
      ...customer,
      orders: customer.orders.map(o => o.id === orderId ? { ...o, delivered_credentials: next } : o),
    });
    toast.success("License saved");
  };

  const removeItem = async (orderId: string, idx: number) => {
    if (!customer) return;
    const order = customer.orders.find(o => o.id === orderId);
    if (!order) return;
    if (!confirm("Remove this line item from the order?")) return;
    const items = [...order.items];
    items.splice(idx, 1);
    const delivered = order.delivered_credentials?.items ? [...order.delivered_credentials.items] : [];
    if (delivered[idx] !== undefined) delivered.splice(idx, 1);
    const { error } = await supabase
      .from("orders")
      .update({ items, delivered_credentials: { items: delivered } })
      .eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    setCustomer({
      ...customer,
      orders: customer.orders.map(o => o.id === orderId ? { ...o, items, delivered_credentials: { items: delivered } } : o),
    });
    toast.success("Item removed");
  };

  const addItem = async (orderId: string, item: OrderItem) => {
    if (!customer) return;
    const order = customer.orders.find(o => o.id === orderId);
    if (!order) return;
    const items = [...order.items, item];
    const { error } = await supabase.from("orders").update({ items }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    setCustomer({
      ...customer,
      orders: customer.orders.map(o => o.id === orderId ? { ...o, items } : o),
    });
    toast.success("Item added");
  };

  const stats = useMemo(() => {
    if (!customer) return { orders: 0, revenue: 0, licenses: 0, pending: 0 };
    let revenue = 0, licenses = 0, pending = 0;
    customer.orders.forEach(o => {
      revenue += Number(o.total || 0);
      const delivered = o.delivered_credentials?.items ?? [];
      o.items.forEach((it, i) => {
        const qty = Math.max(1, Number(it.qty || 1));
        const d = delivered[i];
        if (d?.key) licenses += 1; else pending += qty;
      });
    });
    return { orders: customer.orders.length, revenue, licenses, pending };
  }, [customer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 via-white to-sky-50/40">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 space-y-4">
        {/* Title block */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-500" />
            Customer Licenses Manager
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Search a customer by email/phone/name and edit, add, or remove licenses on any of their orders.
          </p>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
              placeholder="Search by email, phone or name…"
              className="w-full rounded-xl bg-indigo-50/70 border border-indigo-100 pl-11 pr-12 py-3.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              type="button"
              title="Scan"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-lg text-slate-500 hover:bg-white"
            >
              <ScanLine className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => search()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:opacity-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>

        {/* Customer card */}
        {customer && (
          <>
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{customer.name || "Customer"}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>
                  <span className="text-slate-300">·</span>
                  <span>{customer.orders.length} orders</span>
                  {customer.phone && <><span className="text-slate-300">·</span><span>{customer.phone}</span></>}
                </div>
              </div>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Total Orders" value={String(stats.orders)} icon={ShoppingCart} grad="from-violet-500 to-fuchsia-600" />
              <StatTile label="Lifetime Revenue" value={fmt(stats.revenue)} icon={TrendingUp} grad="from-emerald-500 to-teal-600" />
              <StatTile label="Licenses Assigned" value={String(stats.licenses)} icon={KeyRound} grad="from-sky-500 to-indigo-600" />
              <StatTile label="Pending Delivery" value={String(stats.pending)} icon={CalendarClock} grad="from-amber-500 to-orange-600" />
            </div>

            {/* Orders */}
            <div className="space-y-4">
              {customer.orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onStatus={(s) => updateStatus(o.id, s)}
                  onEditItem={(idx, item, current) => setEditing({ orderId: o.id, idx, item, current })}
                  onRemoveItem={(idx) => removeItem(o.id, idx)}
                  onAddItem={() => setAdding({ order: o })}
                />
              ))}
            </div>
          </>
        )}

        {!customer && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
            <Sparkles className="h-8 w-8 text-violet-400 mx-auto" />
            <div className="mt-3 font-semibold text-slate-700">Search a customer to begin</div>
            <div className="text-sm text-slate-500 mt-1">
              Look up by email, phone or name to view every order and license they own.
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditKeyModal
          item={editing.item}
          current={editing.current}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await saveDelivered(editing.orderId, editing.idx, patch);
            setEditing(null);
          }}
        />
      )}

      {adding && (
        <AddItemModal
          onClose={() => setAdding(null)}
          onAdd={async (item) => {
            await addItem(adding.order.id, item);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, grad }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; grad: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
      <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function OrderCard({
  order, onStatus, onEditItem, onRemoveItem, onAddItem,
}: {
  order: OrderRow;
  onStatus: (s: string) => void;
  onEditItem: (idx: number, item: OrderItem, current: DeliveredItem) => void;
  onRemoveItem: (idx: number) => void;
  onAddItem: () => void;
}) {
  const delivered = order.delivered_credentials?.items ?? [];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
        <div className="flex-1 min-w-[200px]">
          <div className="font-bold text-slate-800">#{invoiceCode(order)}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {fmtDate(order.created_at)} · {fmt(Number(order.total))}
          </div>
        </div>
        <select
          value={order.status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgePay(order.payment_status)}`}>
          {(order.payment_status || "—").toLowerCase()}
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
          <Send className="h-3.5 w-3.5" /> Email All Licenses
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
          <FileText className="h-3.5 w-3.5" /> Preview
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Invoice PDF
        </button>
      </div>

      {/* Items */}
      <div className="px-5 py-4 space-y-3">
        {order.items.map((it, idx) => {
          const d = delivered[idx] ?? {};
          const assigned = !!d.key;
          return (
            <div key={idx} className="rounded-xl bg-slate-50/70 border border-slate-100 px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white border border-slate-200 text-base">
                {it.emoji || <Package className="h-4 w-4 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold text-slate-800 text-sm">
                  {it.name}{it.planPeriod ? <span className="text-slate-400 font-normal"> · {it.planPeriod}</span> : null}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Qty: {it.qty || 1}</div>
                <div className={`text-[12px] mt-0.5 font-medium ${assigned ? "text-emerald-600" : "text-amber-600"}`}>
                  {assigned ? `License: ${d.key}` : "No license assigned"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {d.expiry && d.expiry !== "lifetime" ? `Expires ${new Date(d.expiry).toLocaleDateString()}` : "Lifetime / no expiry"}
                </div>
              </div>
              <button
                onClick={() => onEditItem(idx, it, d)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Key
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
                <CalendarClock className="h-3.5 w-3.5" /> Renew
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
                <Send className="h-3.5 w-3.5" /> Email
              </button>
              <button
                onClick={() => onRemoveItem(idx)}
                className="grid place-items-center h-8 w-8 rounded-lg bg-white border border-rose-100 text-rose-500 hover:bg-rose-50"
                title="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        <button
          onClick={onAddItem}
          className="w-full rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Item / License
        </button>
      </div>
    </div>
  );
}

function EditKeyModal({
  item, current, onClose, onSave,
}: { item: OrderItem; current: DeliveredItem; onClose: () => void; onSave: (patch: DeliveredItem) => Promise<void> }) {
  const [key, setKey] = useState(current.key ?? "");
  const [type, setType] = useState(current.type ?? "License Key");
  const [expiry, setExpiry] = useState(current.expiry ?? "lifetime");
  const [via, setVia] = useState<DeliveredItem["delivered_via"]>(current.delivered_via ?? "manual");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-violet-600 font-semibold">Edit Key</div>
            <div className="font-semibold text-slate-800 text-sm">{item.emoji} {item.name}</div>
          </div>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Key Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              {["License Key", "Account", "Activation Code", "Gift Card"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="License Key / Account">
            <textarea value={key} onChange={(e) => setKey(e.target.value)} rows={3} className="input font-mono" placeholder="XXXX-XXXX-XXXX-XXXX or email | password" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">
              <select value={expiry === "lifetime" ? "lifetime" : "custom"} onChange={(e) => setExpiry(e.target.value === "lifetime" ? "lifetime" : new Date().toISOString().slice(0, 10))} className="input">
                <option value="lifetime">Lifetime / no expiry</option>
                <option value="custom">Custom date</option>
              </select>
            </Field>
            {expiry !== "lifetime" && (
              <Field label="Expiry date">
                <input type="date" value={expiry.slice(0, 10)} onChange={(e) => setExpiry(e.target.value)} className="input" />
              </Field>
            )}
            <Field label="Delivered via">
              <select value={via} onChange={(e) => setVia(e.target.value as DeliveredItem["delivered_via"])} className="input">
                <option value="manual">Manual</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onSave({ key: key.trim() || undefined, type, expiry, delivered_via: via }); setSaving(false); }}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save License
          </button>
        </div>
      </div>
    </div>
  );
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: OrderItem) => Promise<void> }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [emoji, setEmoji] = useState("📦");
  const [planPeriod, setPlanPeriod] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold text-slate-800 text-sm">Add Item to Order</div>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Product Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug"><input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
            <Field label="Emoji"><input className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
            <Field label="Qty"><input type="number" min={1} className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
            <Field label="Price"><input type="number" min={0} className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
            <Field label="Plan Period (optional)"><input className="input" value={planPeriod} onChange={(e) => setPlanPeriod(e.target.value)} placeholder="1 Month / Lifetime" /></Field>
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={async () => {
              if (!name.trim()) { toast.error("Name required"); return; }
              setSaving(true);
              await onAdd({ name: name.trim(), slug: slug.trim() || undefined, qty, price, emoji, planPeriod: planPeriod || undefined });
              setSaving(false);
            }}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Item
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</span>
      {children}
      <style>{`.input{width:100%;border:1px solid #e2e8f0;background:#fff;border-radius:0.625rem;padding:0.5rem 0.75rem;font-size:0.875rem;color:#0f172a;outline:none}.input:focus{box-shadow:0 0 0 2px rgba(139,92,246,.35);border-color:#a78bfa}`}</style>
    </label>
  );
}
