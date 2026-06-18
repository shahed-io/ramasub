import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FileText, Receipt, User, CreditCard, Package, Plus, Trash2, Printer,
  Download, Save, RefreshCw, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/admin/invoice-generator")({
  component: InvoiceGeneratorPage,
});

type Plan = { label?: string; duration?: string; price?: number };
type Product = { slug: string; name: string; emoji: string | null; plans: Plan[] };

type Item = {
  uid: string;
  productSlug?: string;
  name: string;
  qty: number;
  price: number;
};

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");

const newItem = (): Item => ({
  uid: Math.random().toString(36).slice(2, 9),
  name: "",
  qty: 1,
  price: 0,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

const PAYMENT_METHODS = [
  { v: "bkash", en: "BKash", bn: "বিকাশ" },
  { v: "nagad", en: "Nagad", bn: "নগদ" },
  { v: "rocket", en: "Rocket", bn: "রকেট" },
  { v: "upay", en: "Upay", bn: "উপায়" },
  { v: "bank", en: "Bank Transfer", bn: "ব্যাংক ট্রান্সফার" },
  { v: "cash", en: "Cash", bn: "ক্যাশ" },
];

function genInvoiceNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${y}${m}${day}-${seq}`;
}

function InvoiceGeneratorPage() {
  const { t, lang } = useAdminLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);

  // Invoice info
  const [invoiceNo, setInvoiceNo] = useState("INV-…");
  const [date, setDate] = useState(todayISO());

  // Customer
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Payment
  const [payMethod, setPayMethod] = useState("bkash");
  const [trxId, setTrxId] = useState("");

  // Items
  const [items, setItems] = useState<Item[]>([newItem()]);

  // Pricing
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInvoiceNo(genInvoiceNo());
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("slug,name,emoji,plans")
        .eq("is_active", true)
        .order("name");
      setProducts(((data ?? []) as unknown) as Product[]);
    })();
  }, []);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0),
    [items],
  );
  const total = Math.max(0, subtotal - Number(discount || 0));

  const update = (uid: string, patch: Partial<Item>) =>
    setItems((cur) => cur.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));

  const remove = (uid: string) =>
    setItems((cur) => (cur.length > 1 ? cur.filter((i) => i.uid !== uid) : cur));

  const pickProduct = (uid: string, slug: string) => {
    if (!slug) return update(uid, { productSlug: undefined });
    const p = products.find((x) => x.slug === slug);
    if (!p) return;
    const plan = p.plans?.[0];
    update(uid, {
      productSlug: slug,
      name: plan?.label ? `${p.name} — ${plan.label}` : p.name,
      price: Number(plan?.price ?? 0),
    });
  };

  const reset = () => {
    if (!confirm(t("Reset the invoice?", "ইনভয়েস রিসেট করবেন?"))) return;
    setInvoiceNo(genInvoiceNo());
    setDate(todayISO());
    setName(""); setEmail(""); setPhone(""); setAddress("");
    setPayMethod("bkash"); setTrxId("");
    setItems([newItem()]);
    setDiscount(0); setNote("");
  };

  const ensureValid = (): boolean => {
    if (!name.trim()) { toast.error(t("Customer name is required", "গ্রাহকের নাম দিতে হবে")); return false; }
    if (items.every((i) => !i.name.trim() && !i.price)) {
      toast.error(t("Add at least one item", "অন্তত একটি আইটেম যোগ করুন")); return false;
    }
    return true;
  };

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AccessNow BD", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Invoice", margin, 64);
    doc.setFontSize(10);
    doc.text(`#${invoiceNo}`, pageW - margin, 42, { align: "right" });
    doc.text(date, pageW - margin, 60, { align: "right" });

    y = 120;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Bill To", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 16;
    doc.text(name || "—", margin, y); y += 14;
    if (phone) { doc.text(phone, margin, y); y += 14; }
    if (email) { doc.text(email, margin, y); y += 14; }
    if (address) {
      const lines = doc.splitTextToSize(address, 260);
      doc.text(lines, margin, y); y += 14 * lines.length;
    }

    // Items table
    y = Math.max(y + 10, 220);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, pageW - margin * 2, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Item", margin + 8, y + 16);
    doc.text("Qty", pageW - margin - 200, y + 16);
    doc.text("Price", pageW - margin - 130, y + 16);
    doc.text("Total", pageW - margin - 8, y + 16, { align: "right" });
    y += 30;
    doc.setFont("helvetica", "normal");
    for (const it of items) {
      if (!it.name && !it.price) continue;
      const line = doc.splitTextToSize(it.name || "—", pageW - margin * 2 - 240);
      doc.text(line, margin + 8, y);
      doc.text(String(it.qty), pageW - margin - 200, y);
      doc.text(fmt(it.price), pageW - margin - 130, y);
      doc.text(fmt(it.price * it.qty), pageW - margin - 8, y, { align: "right" });
      y += 16 * line.length + 4;
    }

    // Totals
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", pageW - margin - 130, y);
    doc.text(fmt(subtotal), pageW - margin - 8, y, { align: "right" });
    if (discount > 0) {
      y += 16;
      doc.text("Discount", pageW - margin - 130, y);
      doc.text("- " + fmt(discount), pageW - margin - 8, y, { align: "right" });
    }
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Total", pageW - margin - 130, y);
    doc.text(fmt(total), pageW - margin - 8, y, { align: "right" });

    // Payment + Note
    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Payment", margin, y);
    doc.setFont("helvetica", "normal");
    const pm = PAYMENT_METHODS.find((p) => p.v === payMethod);
    doc.text(`${pm?.en ?? payMethod}${trxId ? ` · ${trxId}` : ""}`, margin + 60, y);
    if (note) {
      y += 18;
      doc.setFont("helvetica", "bold");
      doc.text("Note", margin, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(note, pageW - margin * 2 - 60);
      doc.text(lines, margin + 60, y);
    }

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your purchase!", pageW / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

    return doc;
  };

  const downloadPdf = () => {
    if (!ensureValid()) return;
    const doc = buildPdf();
    doc.save(`${invoiceNo}.pdf`);
  };

  const previewPrint = () => {
    if (!ensureValid()) return;
    const doc = buildPdf();
    const url = doc.output("bloburl");
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 600);
  };

  const saveInvoice = async () => {
    if (!ensureValid()) return;
    setSaving(true);
    const payload = {
      kind: "invoice",
      is_active: true,
      data: {
        invoice_no: invoiceNo,
        customer: name, phone, email, address,
        date,
        payment_method: payMethod,
        transaction_id: trxId,
        items: items.filter((i) => i.name || i.price).map((i) => ({
          name: i.name, qty: i.qty, price: i.price,
        })),
        subtotal, discount, total,
        note,
      } as never,
    };
    const { error } = await supabase.from("admin_records").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Invoice saved", "ইনভয়েস সংরক্ষিত হয়েছে"));
  };

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 w-11 h-11 rounded-xl bg-violet-50 ring-1 ring-violet-100 text-violet-600 grid place-items-center">
            <FileText className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {t("Create Invoice", "ইনভয়েস তৈরি করুন")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t("Create and print custom invoices.", "কাস্টম ইনভয়েস তৈরি এবং প্রিন্ট করুন।")}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          {t("Reset", "রিসেট")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT column */}
        <div className="space-y-5">
          {/* Invoice info */}
          <Card icon={<Receipt className="w-4 h-4" />} title={t("Invoice info", "ইনভয়েস তথ্য")}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Invoice no.", "ইনভয়েস নম্বর")}>
                <input
                  value={mounted ? invoiceNo : ""}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={t("Date", "তারিখ")}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* Customer info */}
          <Card icon={<User className="w-4 h-4" />} title={t("Customer info", "গ্রাহক তথ্য")}>
            <Field label={t("Name", "নাম")} required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Customer name", "গ্রাহকের নাম")}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label={t("Email", "ইমেইল")}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={inputCls}
                />
              </Field>
              <Field label={t("Phone", "ফোন")}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label={t("Address", "ঠিকানা")} className="mt-3">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("Address (optional)", "ঠিকানা (ঐচ্ছিক)")}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Payment info */}
          <Card icon={<CreditCard className="w-4 h-4" />} title={t("Payment info", "পেমেন্ট তথ্য")}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Payment method", "পেমেন্ট মেথড")}>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls}>
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.v} value={p.v}>{lang === "bn" ? p.bn : p.en}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Transaction ID", "ট্রানজেকশন আইডি")}>
                <input
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder={t("TrxID (optional)", "TrxID (ঐচ্ছিক)")}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          {/* Items */}
          <Card
            icon={<Package className="w-4 h-4" />}
            title={t("Products / Services", "পণ্য / সার্ভিস")}
            action={
              <button
                onClick={() => setItems((c) => [...c, newItem()])}
                className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800"
              >
                <Plus className="w-4 h-4" /> {t("Add item", "আইটেম যোগ")}
              </button>
            }
          >
            <div className="space-y-3">
              {items.map((it, idx) => {
                const lineTotal = Number(it.price || 0) * Number(it.qty || 1);
                return (
                  <div key={it.uid} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-bold text-slate-500 w-5 pt-2.5">{idx + 1}.</div>
                      <div className="flex-1 space-y-2">
                        <select
                          value={it.productSlug ?? ""}
                          onChange={(e) => pickProduct(it.uid, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">
                            {t("— Select from our products (or type manually below) —", "— আমাদের পণ্য থেকে বাছাই করুন (অথবা নিচে manual লিখুন) —")}
                          </option>
                          {products.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.emoji ? p.emoji + " " : ""}{p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={it.name}
                          onChange={(e) => update(it.uid, { name: e.target.value })}
                          placeholder={t("Product name / description (manual)", "পণ্যের নাম / বিবরণ (manual)")}
                          className={inputCls}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Field label={t("Qty", "পরিমাণ")} compact>
                            <input
                              type="number"
                              min={1}
                              value={it.qty}
                              onChange={(e) => update(it.uid, { qty: Math.max(1, Number(e.target.value) || 1) })}
                              className={inputCls}
                            />
                          </Field>
                          <Field label={t("Price (৳)", "দাম (৳)")} compact>
                            <input
                              type="number"
                              min={0}
                              value={it.price || ""}
                              onChange={(e) => update(it.uid, { price: Number(e.target.value) || 0 })}
                              className={inputCls}
                            />
                          </Field>
                        </div>
                        <div className="text-right text-xs font-semibold text-violet-700">
                          {t("Subtotal:", "মোট:")} {fmt(lineTotal)}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(it.uid)}
                        disabled={items.length === 1}
                        className="w-9 h-9 grid place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={t("Remove", "ডিলিট")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Discount + note */}
          <Card>
            <Field label={t("Discount (৳)", "ডিসকাউন্ট (৳)")}>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className={inputCls}
              />
            </Field>
            <Field label={t("Note (optional)", "নোট (ঐচ্ছিক)")} className="mt-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("Extra info…", "অতিরিক্ত তথ্য…")}
                className={`${inputCls} h-auto py-2`}
              />
            </Field>
          </Card>

          {/* Totals + actions */}
          <Card>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-600 mt-1">
                <span>{t("Discount", "ডিসকাউন্ট")}:</span>
                <span className="font-semibold text-rose-600">- {fmt(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
              <span className="text-lg font-extrabold text-violet-700">Total:</span>
              <span className="text-2xl font-extrabold text-violet-700">{fmt(total)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={previewPrint}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition"
              >
                <Printer className="w-4 h-4" />
                {t("Preview & Print", "প্রিভিউ ও প্রিন্ট")}
              </button>
              <button
                onClick={downloadPdf}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Download className="w-4 h-4" />
                {t("Download PDF", "PDF ডাউনলোড")}
              </button>
              <button
                onClick={saveInvoice}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-sm font-bold hover:bg-violet-100 transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("Save to records", "রেকর্ডে সংরক্ষণ")}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition";

function Card({
  icon, title, action, children,
}: { icon?: React.ReactNode; title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 grid place-items-center">{icon}</span>
            {title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({
  label, required, compact, className, children,
}: { label: string; required?: boolean; compact?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className={`block ${compact ? "text-[11px]" : "text-xs"} font-bold text-slate-700 mb-1.5`}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
