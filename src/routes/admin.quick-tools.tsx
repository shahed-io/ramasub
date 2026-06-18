import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Download, Send, FileText, Plus, Trash2, Search, Upload, MessageCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadReceiptPdf, getReceiptBlob, receiptFileName, type ReceiptOrder } from "@/lib/receipt";
import { useProducts } from "@/hooks/useProducts";
import { useShopConfig } from "@/hooks/useShopConfig";
import { AdminGlassCard } from "@/components/admin/AdminStatCard";
import { ProductPicker } from "@/components/admin/ProductPicker";

export const Route = createFileRoute("/admin/quick-tools")({
  component: QuickToolsPage,
  head: () => ({ meta: [{ title: "Quick Tools — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Tab = "invoice" | "quick-order" | "bulk-delivery";

// Normalize BD phone to international wa.me format (8801XXXXXXXXX)
function normalizeWaPhone(p?: string | null): string {
  const d = (p || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return "880" + d.slice(1);
  if (d.length === 10) return "880" + d;
  return d;
}

function fmt(n: number) { return "৳" + Number(n || 0).toLocaleString("en-IN"); }

async function uploadInvoicePdf(blob: Blob, fileName: string): Promise<string> {
  const path = `invoices/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage.from("admin-uploads").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
  return data.publicUrl;
}

function openWa(phone: string, message: string) {
  const num = normalizeWaPhone(phone);
  if (!num) { toast.error("কাস্টমারের ফোন নাম্বার নেই"); return; }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function QuickToolsPage() {
  const [tab, setTab] = useState<Tab>("invoice");

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Quick Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">দ্রুত ইনভয়েস, কুইক অর্ডার এবং বাল্ক ডেলিভারি — WhatsApp-এ সরাসরি পাঠান</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabBtn active={tab === "invoice"} onClick={() => setTab("invoice")} icon={<FileText className="w-4 h-4" />} label="WhatsApp Invoice" />
        <TabBtn active={tab === "quick-order"} onClick={() => setTab("quick-order")} icon={<Plus className="w-4 h-4" />} label="Quick Order Creator" />
        <TabBtn active={tab === "bulk-delivery"} onClick={() => setTab("bulk-delivery")} icon={<Send className="w-4 h-4" />} label="Bulk Delivery Sender" />
      </div>

      {tab === "invoice" && <InvoiceFromOrders />}
      {tab === "quick-order" && <QuickOrderCreator />}
      {tab === "bulk-delivery" && <BulkDeliverySender />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------------- Invoice from Orders ---------------- */
type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  items: Array<{ name?: string; slug?: string; plan?: string; planPeriod?: string; price: number; qty?: number }>;
  transaction_id: string;
  payment_method: string;
  phone: string;
  email: string;
  full_name: string;
};

function InvoiceFromOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: shop } = useShopConfig();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return o.id.toLowerCase().includes(s) || o.full_name?.toLowerCase().includes(s) || o.phone?.toLowerCase().includes(s) || o.email?.toLowerCase().includes(s);
  });

  const toReceipt = (o: OrderRow): ReceiptOrder => ({
    id: o.id,
    full_name: o.full_name,
    email: o.email,
    phone: o.phone,
    payment_method: o.payment_method,
    transaction_id: o.transaction_id,
    total: Number(o.total),
    created_at: o.created_at,
    items: (o.items ?? []).map((it) => ({
      name: it.name,
      slug: it.slug ?? "",
      planPeriod: it.planPeriod ?? it.plan ?? "",
      qty: it.qty ?? 1,
      price: it.price,
    })),
  });

  const sendWa = async (o: OrderRow) => {
    setBusyId(o.id);
    try {
      const receipt = toReceipt(o);
      const blob = getReceiptBlob(receipt);
      const url = await uploadInvoicePdf(blob, receiptFileName(receipt));
      const itemsTxt = receipt.items.map((it, i) => `${i + 1}. ${it.name ?? it.slug} — ${it.planPeriod} × ${it.qty}`).join("\n");
      const msg = [
        `🧾 *${shop?.shop_name ?? "AccessNow BD"} — Invoice*`,
        `Order #${o.id.slice(0, 8).toUpperCase()}`,
        "",
        itemsTxt,
        "",
        `*Total: ${fmt(receipt.total)}*`,
        `Payment: ${o.payment_method?.toUpperCase()}`,
        "",
        `📄 Invoice PDF: ${url}`,
        "",
        "Thank you for your purchase! 💜",
      ].join("\n");
      openWa(o.phone, msg);
      toast.success("WhatsApp opened with invoice link");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload invoice");
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (o: OrderRow) => {
    setBusyId(o.id);
    try {
      const blob = getReceiptBlob(toReceipt(o));
      const url = await uploadInvoicePdf(blob, receiptFileName(toReceipt(o)));
      await navigator.clipboard.writeText(url);
      toast.success("Invoice link copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminGlassCard className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order ID, নাম, ফোন, ইমেইল…"
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> লোড হচ্ছে…</div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-2">Order</th>
                <th className="text-left px-2 py-2">Customer</th>
                <th className="text-left px-2 py-2">Total</th>
                <th className="text-right px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-2 py-2">
                    <div className="font-mono text-xs">#{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{o.full_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone || o.email}</div>
                  </td>
                  <td className="px-2 py-2 font-semibold">{fmt(Number(o.total))}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => downloadReceiptPdf(toReceipt(o))}
                        title="Download PDF"
                        className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-secondary"
                      ><Download className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => copyLink(o)}
                        disabled={busyId === o.id}
                        title="Copy invoice link"
                        className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-50"
                      >{busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      <button
                        onClick={() => sendWa(o)}
                        disabled={busyId === o.id}
                        className="h-8 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                        Send
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminGlassCard>
  );
}

/* ---------------- Quick Order Creator ---------------- */
type QItem = { productSlug: string; productName: string; planPeriod: string; qty: number; price: number };

function QuickOrderCreator() {
  const { products } = useProducts();
  const { data: shop } = useShopConfig();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [trxId, setTrxId] = useState("");
  const [items, setItems] = useState<QItem[]>([]);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0), [items]);

  const addItem = () => setItems((x) => [...x, { productSlug: "", productName: "", planPeriod: "1 Month", qty: 1, price: 0 }]);
  const removeItem = (i: number) => setItems((x) => x.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<QItem>) => setItems((x) => x.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const onPickProduct = (i: number, slug: string) => {
    const p = products.find((x) => x.slug === slug);
    if (!p) { updateItem(i, { productSlug: slug }); return; }
    const firstPlan = p.plans[0];
    updateItem(i, {
      productSlug: slug,
      productName: p.name,
      planPeriod: firstPlan?.period || "1 Month",
      price: firstPlan ? Number(String(firstPlan.price).replace(/[^\d.]/g, "")) || 0 : 0,
    });
  };

  const buildReceipt = (): ReceiptOrder => ({
    id: "Q" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    full_name: name || "Customer",
    email: email || "—",
    phone: phone || "—",
    payment_method: paymentMethod,
    transaction_id: trxId || "—",
    total,
    created_at: new Date().toISOString(),
    items: items.map((it) => ({ name: it.productName, slug: it.productSlug, planPeriod: it.planPeriod, qty: it.qty, price: it.price })),
  });

  const validate = () => {
    if (!name.trim()) { toast.error("কাস্টমারের নাম দিন"); return false; }
    if (!phone.trim()) { toast.error("WhatsApp নাম্বার দিন"); return false; }
    if (items.length === 0) { toast.error("কমপক্ষে একটি প্রোডাক্ট যোগ করুন"); return false; }
    return true;
  };

  const onDownload = () => {
    if (!validate()) return;
    downloadReceiptPdf(buildReceipt());
  };

  const onSendWa = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const receipt = buildReceipt();
      const blob = getReceiptBlob(receipt);
      const url = await uploadInvoicePdf(blob, receiptFileName(receipt));
      const itemsTxt = receipt.items.map((it, i) => `${i + 1}. ${it.name} — ${it.planPeriod} × ${it.qty} = ${fmt((it.price ?? 0) * it.qty)}`).join("\n");
      const msg = [
        `🧾 *${shop?.shop_name ?? "AccessNow BD"} — Invoice*`,
        `Order #${receipt.id}`,
        "",
        itemsTxt,
        "",
        `*Total: ${fmt(total)}*`,
        `Payment: ${paymentMethod.toUpperCase()}`,
        trxId ? `Trx: ${trxId}` : "",
        "",
        `📄 Invoice PDF: ${url}`,
        "",
        "Thank you! 💜",
      ].filter(Boolean).join("\n");
      openWa(phone, msg);
      toast.success("WhatsApp opened with invoice");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminGlassCard className="p-4 md:p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="কাস্টমারের নাম *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="WhatsApp নাম্বার *"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className={inputCls} /></Field>
        <Field label="ইমেইল"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        <Field label="Payment Method">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>
        </Field>
        <Field label="Transaction ID"><input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls} /></Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Items</h3>
          <button onClick={addItem} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>

        {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">কোন আইটেম যোগ হয়নি</p>}

        {items.map((it, i) => {
          const product = products.find((p) => p.slug === it.productSlug);
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-card">
              <div className="col-span-12 md:col-span-4">
                <label className="text-xs text-muted-foreground">Product</label>
                <ProductPicker
                  value={it.productSlug}
                  onChange={(slug) => onPickProduct(i, slug)}
                  placeholder="— Select product —"
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-xs text-muted-foreground">Plan</label>
                <select value={it.planPeriod} onChange={(e) => {
                  const plan = product?.plans.find((pl) => pl.period === e.target.value);
                  updateItem(i, { planPeriod: e.target.value, price: plan ? Number(String(plan.price).replace(/[^\d.]/g, "")) || it.price : it.price });
                }} className={inputCls}>
                  {(product?.plans ?? [{ period: it.planPeriod || "1 Month", price: "0" }]).map((pl) => (
                    <option key={pl.period} value={pl.period}>{pl.period}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="text-xs text-muted-foreground">Qty</label>
                <input type="number" min={1} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 1 })} className={inputCls} />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="text-xs text-muted-foreground">Price (৳)</label>
                <input type="number" min={0} value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div className="col-span-12 md:col-span-1">
                <button onClick={() => removeItem(i)} className="h-10 w-full grid place-items-center rounded-lg border border-border hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-extrabold text-foreground">{fmt(total)}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDownload} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-secondary">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={onSendWa} disabled={busy} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Send via WhatsApp
          </button>
        </div>
      </div>
    </AdminGlassCard>
  );
}

/* ---------------- Bulk Delivery Sender ---------------- */
function BulkDeliverySender() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<string>(
    `✅ *Delivery — {{shop}}*\n\nOrder #{{order_id}}\nProduct: {{items}}\n\n🔑 Login: {{login}}\n🔒 Password: {{password}}\n\nNote: পাসওয়ার্ড পরিবর্তন করবেন না।\nWarranty: {{warranty}}\n\nধন্যবাদ! 💜`,
  );
  const [defaults, setDefaults] = useState({ login: "", password: "", warranty: "1 month" });
  const { data: shop } = useShopConfig();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["completed", "processing"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) toast.error(error.message);
      setOrders((data ?? []) as unknown as OrderRow[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => s.size === orders.length ? new Set() : new Set(orders.map((o) => o.id)));

  const renderMessage = (o: OrderRow) => {
    const items = (o.items ?? []).map((it) => `${it.name ?? it.slug} (${it.planPeriod ?? it.plan ?? ""})`).join(", ");
    return template
      .replace(/\{\{shop\}\}/g, shop?.shop_name ?? "AccessNow BD")
      .replace(/\{\{order_id\}\}/g, o.id.slice(0, 8).toUpperCase())
      .replace(/\{\{customer\}\}/g, o.full_name || "Customer")
      .replace(/\{\{items\}\}/g, items)
      .replace(/\{\{login\}\}/g, defaults.login || "—")
      .replace(/\{\{password\}\}/g, defaults.password || "—")
      .replace(/\{\{warranty\}\}/g, defaults.warranty || "—");
  };

  const sendOne = (o: OrderRow) => openWa(o.phone, renderMessage(o));

  const sendAll = async () => {
    const list = orders.filter((o) => selected.has(o.id));
    if (list.length === 0) { toast.error("কোন অর্ডার সিলেক্ট করুন"); return; }
    if (!confirm(`${list.length} জন কাস্টমারের কাছে WhatsApp পাঠানো হবে — ব্রাউজার একাধিক ট্যাব খুলবে। চালিয়ে যান?`)) return;
    for (const o of list) {
      sendOne(o);
      await new Promise((r) => setTimeout(r, 400));
    }
    toast.success(`${list.length} জনের কাছে WhatsApp টাব খোলা হয়েছে`);
  };

  return (
    <AdminGlassCard className="p-4 md:p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">Delivery Template</h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Auto-fill from product:</span>
            <div className="w-56">
              <ProductPicker
                value=""
                allowClear={false}
                placeholder="Pick product…"
                onChange={(_slug, product) => {
                  if (!product) return;
                  setDefaults((d) => ({
                    ...d,
                    warranty: product.warranty || d.warranty,
                  }));
                  // Insert a product-aware template if user hasn't customized
                  const preset = `✅ *${product.name} — Delivery*\n\nOrder #{{order_id}}\nProduct: {{items}}\nCategory: ${product.category}\n\n🔑 Login: {{login}}\n🔒 Password: {{password}}\n\n⏱ Delivery: ${product.deliveryTime}\n🛡 Warranty: ${product.warranty}\n\n${(product.features ?? []).slice(0, 3).map((f) => `• ${f}`).join("\n")}\n\nধন্যবাদ — {{shop}} 💜`;
                  setTemplate(preset);
                  toast.success(`Template loaded from ${product.name}`);
                }}
              />
            </div>
          </div>
        </div>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={8}
          className="w-full text-sm font-mono p-3 rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-muted-foreground mt-1">Variables: {"{{shop}}, {{order_id}}, {{customer}}, {{items}}, {{login}}, {{password}}, {{warranty}}"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Login / Email"><input value={defaults.login} onChange={(e) => setDefaults({ ...defaults, login: e.target.value })} className={inputCls} /></Field>
        <Field label="Password / Key"><input value={defaults.password} onChange={(e) => setDefaults({ ...defaults, password: e.target.value })} className={inputCls} /></Field>
        <Field label="Warranty"><input value={defaults.warranty} onChange={(e) => setDefaults({ ...defaults, warranty: e.target.value })} className={inputCls} /></Field>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={toggleAll} className="text-xs font-semibold text-primary hover:underline">
          {selected.size === orders.length && orders.length > 0 ? "Deselect all" : "Select all"}
        </button>
        <button onClick={sendAll} disabled={selected.size === 0} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
          <Send className="w-4 h-4" /> Send to {selected.size || 0} customers
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> লোড হচ্ছে…</div>
      ) : (
        <div className="overflow-x-auto -mx-2 max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-card">
              <tr>
                <th className="px-2 py-2 w-8"></th>
                <th className="text-left px-2 py-2">Order</th>
                <th className="text-left px-2 py-2">Customer</th>
                <th className="text-left px-2 py-2">Items</th>
                <th className="text-right px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="w-4 h-4 accent-primary" />
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{o.full_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground max-w-[260px] truncate">
                    {(o.items ?? []).map((it) => it.name ?? it.slug).join(", ")}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => sendOne(o)} className="h-8 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold inline-flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> Send
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminGlassCard>
  );
}

/* ---------------- shared ---------------- */
const inputCls = "w-full h-10 px-3 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}
