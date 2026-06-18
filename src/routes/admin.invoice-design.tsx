import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Palette, LayoutGrid, Building2, Tag, Code2, Save, RotateCcw,
  Loader2, Eye, Sparkles, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/invoice-design")({
  component: InvoiceDesignPage,
});

type Design = {
  brandColor: string;
  brandLight: string;
  headerBg: string;
  headerText: string;
  totalColor: string;       // "auto" or hex
  bodyDark: string;
  cardRadius: number;
  showLogo: boolean;
  invoiceTitle: string;
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  thankYouText: string;
  footerNote: string;
  // labels
  billingLabel: string;
  paymentLabel: string;
  itemColumn: string;
  qtyColumn: string;
  priceColumn: string;
  totalColumn: string;
  subtotalRow: string;
  discountRow: string;
  grandTotalRow: string;
};

const DEFAULTS: Design = {
  brandColor: "#7c3aed",
  brandLight: "#f3e8ff",
  headerBg: "#bfdbfe",
  headerText: "#0f172a",
  totalColor: "auto",
  bodyDark: "#1e1a2e",
  cardRadius: 18,
  showLogo: true,
  invoiceTitle: "INVOICE",
  companyName: "Shahed Store",
  companyWebsite: "shahedstore.com.bd",
  companyEmail: "info@shahedstore.com.bd",
  companyPhone: "",
  companyAddress: "",
  thankYouText: "Thank you for shopping with us!",
  footerNote: "This is a computer-generated invoice and does not require a signature.",
  billingLabel: "Billing Info",
  paymentLabel: "Payment Info",
  itemColumn: "Item",
  qtyColumn: "Qty",
  priceColumn: "Price",
  totalColumn: "Total",
  subtotalRow: "Subtotal",
  discountRow: "Discount",
  grandTotalRow: "Total",
};

const KIND = "invoice_design";

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");

function InvoiceDesignPage() {
  const { t } = useAdminLang();
  const [design, setDesign] = useState<Design>(DEFAULTS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_records").select("*").eq("kind", KIND).limit(1);
    if (error) toast.error(error.message);
    const row = (data ?? [])[0] as { id: string; data: Partial<Design> } | undefined;
    const merged = { ...DEFAULTS, ...(row?.data ?? {}) } as Design;
    setDesign(merged);
    setRecordId(row?.id ?? null);
    setJsonText(JSON.stringify(merged, null, 2));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = <K extends keyof Design>(key: K, value: Design[K]) => {
    setDesign((d) => {
      const next = { ...d, [key]: value };
      setJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const payload = { kind: KIND, data: design as unknown as never, is_active: true };
    const op = recordId
      ? supabase.from("admin_records").update(payload).eq("id", recordId)
      : supabase.from("admin_records").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Design saved", "ডিজাইন সংরক্ষিত হয়েছে"));
    load();
  };

  const reset = () => {
    if (!confirm(t("Reset to default design?", "ডিফল্ট ডিজাইনে রিসেট করবেন?"))) return;
    setDesign(DEFAULTS);
    setJsonText(JSON.stringify(DEFAULTS, null, 2));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setDesign({ ...DEFAULTS, ...parsed });
      toast.success(t("JSON applied", "JSON প্রয়োগ হয়েছে"));
    } catch {
      toast.error(t("Invalid JSON", "অবৈধ JSON"));
    }
  };

  const totalColor = design.totalColor === "auto" ? design.brandColor : design.totalColor;

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={reset} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
          <RotateCcw className="w-4 h-4" /> {t("Reset", "রিসেট")}
        </button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-semibold shadow-lg hover:opacity-95 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("Save Design", "ডিজাইন সংরক্ষণ")}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* LEFT: Controls */}
        <div className="space-y-5">
          {/* Colors */}
          <Section icon={<Palette className="w-4 h-4" />} title={t("Colors", "কালার")} accent="from-rose-400 to-fuchsia-500">
            <ColorField label={t("Brand color", "ব্র্যান্ড কালার")} value={design.brandColor} onChange={(v) => update("brandColor", v)} />
            <ColorField label={t("Brand light tint", "ব্র্যান্ড হালকা টিন্ট")} value={design.brandLight} onChange={(v) => update("brandLight", v)} />
            <ColorField label={t("Table header background", "টেবিল হেডার ব্যাকগ্রাউন্ড")} value={design.headerBg} onChange={(v) => update("headerBg", v)} autoBtn onAuto={() => update("headerBg", design.brandLight)} hint={t("Auto: matches brand tint for soft headers.", "অটো: ব্র্যান্ড টিন্টের সাথে মিল।")} />
            <ColorField label={t("Table header text", "টেবিল হেডার টেক্সট")} value={design.headerText} onChange={(v) => update("headerText", v)} />
            <ColorField
              label={t("Total amount color", "টোটাল অ্যামাউন্ট কালার")}
              value={design.totalColor}
              onChange={(v) => update("totalColor", v)}
              autoBtn
              onAuto={() => update("totalColor", "auto")}
              hint={t('Use "auto" to follow the brand color.', '"auto" দিলে ব্র্যান্ড কালার অনুসরণ করবে।')}
            />
            <ColorField label={t("Body dark text", "বডি টেক্সট")} value={design.bodyDark} onChange={(v) => update("bodyDark", v)} />
          </Section>

          {/* Layout */}
          <Section icon={<LayoutGrid className="w-4 h-4" />} title={t("Layout", "লেআউট")} accent="from-sky-400 to-blue-500">
            <div>
              <label className="text-xs font-semibold text-slate-600">{t("Card border radius", "কার্ড বর্ডার রেডিয়াস")} ({design.cardRadius}px)</label>
              <input
                type="range" min={0} max={32} value={design.cardRadius}
                onChange={(e) => update("cardRadius", Number(e.target.value))}
                className="w-full mt-2 accent-violet-600"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={design.showLogo} onChange={(e) => update("showLogo", e.target.checked)} className="w-4 h-4 accent-violet-600" />
              {t("Show company logo", "কোম্পানির লোগো দেখান")}
            </label>
          </Section>

          {/* Company info */}
          <Section icon={<Building2 className="w-4 h-4" />} title={t("Company info", "কোম্পানি তথ্য")} accent="from-emerald-400 to-teal-500">
            <TextField label={t("Invoice title", "ইনভয়েস টাইটেল")} value={design.invoiceTitle} onChange={(v) => update("invoiceTitle", v)} />
            <TextField label={t("Company name", "কোম্পানির নাম")} value={design.companyName} onChange={(v) => update("companyName", v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label={t("Website", "ওয়েবসাইট")} value={design.companyWebsite} onChange={(v) => update("companyWebsite", v)} />
              <TextField label={t("Email", "ইমেইল")} value={design.companyEmail} onChange={(v) => update("companyEmail", v)} />
              <TextField label={t("Phone", "ফোন")} value={design.companyPhone} onChange={(v) => update("companyPhone", v)} />
              <TextField label={t("Address", "ঠিকানা")} value={design.companyAddress} onChange={(v) => update("companyAddress", v)} />
            </div>
            <TextField label={t("Thank-you text", "ধন্যবাদ মেসেজ")} value={design.thankYouText} onChange={(v) => update("thankYouText", v)} />
            <TextField label={t("Footer note", "ফুটার নোট")} value={design.footerNote} onChange={(v) => update("footerNote", v)} />
          </Section>

          {/* Labels */}
          <Section icon={<Tag className="w-4 h-4" />} title={t("Labels", "লেবেল")} accent="from-amber-400 to-orange-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label={t("Billing block", "বিলিং ব্লক")} value={design.billingLabel} onChange={(v) => update("billingLabel", v)} />
              <TextField label={t("Payment block", "পেমেন্ট ব্লক")} value={design.paymentLabel} onChange={(v) => update("paymentLabel", v)} />
              <TextField label={t("Item column", "আইটেম কলাম")} value={design.itemColumn} onChange={(v) => update("itemColumn", v)} />
              <TextField label={t("Qty column", "Qty কলাম")} value={design.qtyColumn} onChange={(v) => update("qtyColumn", v)} />
              <TextField label={t("Price column", "প্রাইস কলাম")} value={design.priceColumn} onChange={(v) => update("priceColumn", v)} />
              <TextField label={t("Total column", "টোটাল কলাম")} value={design.totalColumn} onChange={(v) => update("totalColumn", v)} />
              <TextField label={t("Subtotal row", "সাবটোটাল")} value={design.subtotalRow} onChange={(v) => update("subtotalRow", v)} />
              <TextField label={t("Discount row", "ডিসকাউন্ট")} value={design.discountRow} onChange={(v) => update("discountRow", v)} />
              <TextField label={t("Grand total row", "গ্র্যান্ড টোটাল")} value={design.grandTotalRow} onChange={(v) => update("grandTotalRow", v)} />
            </div>
          </Section>

          {/* JSON */}
          <Section icon={<Code2 className="w-4 h-4" />} title={t("Manual JSON Editor", "ম্যানুয়াল JSON এডিটর")} accent="from-slate-500 to-slate-700"
            right={
              <div className="flex gap-2">
                <button onClick={applyJson} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-xs font-semibold shadow">
                  <Sparkles className="w-3.5 h-3.5" /> {t("Apply JSON", "প্রয়োগ করুন")}
                </button>
                <button onClick={() => setJsonText(JSON.stringify(design, null, 2))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold">
                  <RefreshCw className="w-3.5 h-3.5" /> {t("Reload", "রিলোড")}
                </button>
              </div>
            }
          >
            <p className="text-xs text-slate-500 -mt-1">{t('Edit raw values directly, then "Apply JSON" to push to the preview.', 'সরাসরি ভ্যালু এডিট করে "Apply JSON" চাপুন।')}</p>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              className="w-full h-72 mt-2 font-mono text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </Section>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Section icon={<Eye className="w-4 h-4" />} title={t("Live Preview", "লাইভ প্রিভিউ")} accent="from-violet-500 to-fuchsia-500">
            <InvoicePreview design={design} totalColor={totalColor} />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ============================== Building blocks ============================== */

function Section({
  icon, title, children, accent, right,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; accent: string; right?: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 grid place-items-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}>{icon}</span>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        </div>
        {right}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
    </div>
  );
}

function ColorField({
  label, value, onChange, autoBtn, onAuto, hint,
}: { label: string; value: string; onChange: (v: string) => void; autoBtn?: boolean; onAuto?: () => void; hint?: string }) {
  const isAuto = value === "auto";
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden grid place-items-center bg-white">
          {isAuto ? (
            <span className="text-[10px] font-bold text-slate-500">AUTO</span>
          ) : (
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-12 cursor-pointer -m-1"
            />
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {autoBtn && (
          <button onClick={onAuto} className="h-10 px-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-xs font-bold shadow">
            Auto
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/* ============================== Preview ============================== */

function InvoicePreview({ design, totalColor }: { design: Design; totalColor: string }) {
  const items = useMemo(() => ([
    { name: "Demo Product A", qty: 1, price: 1200 },
    { name: "Demo Product B", qty: 2, price: 400 },
  ]), []);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = 0;
  const total = subtotal - discount;

  return (
    <div
      className="border border-slate-200 bg-white overflow-hidden"
      style={{ borderRadius: design.cardRadius, color: design.bodyDark }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {design.showLogo && (
            <div
              className="w-12 h-12 rounded-xl grid place-items-center text-white font-bold shadow"
              style={{ background: `linear-gradient(135deg, ${design.brandColor}, ${design.brandLight})` }}
            >
              {design.companyName.charAt(0) || "S"}
            </div>
          )}
          <div>
            <div className="text-base font-extrabold" style={{ color: design.brandColor }}>{design.companyName}</div>
            <div className="text-[11px] opacity-70">{design.companyAddress || design.companyWebsite}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-wider" style={{ color: design.brandColor }}>{design.invoiceTitle}</div>
          <div className="text-[11px] opacity-70 font-mono mt-1">#INV-PREVIEW-001</div>
        </div>
      </div>

      {/* Billing / Payment */}
      <div className="grid grid-cols-2 gap-3 px-6">
        <div className="rounded-xl p-3" style={{ background: design.brandLight }}>
          <div className="text-[10px] font-bold tracking-wider uppercase opacity-70">{design.billingLabel}</div>
          <div className="text-sm font-bold mt-1">Sample Customer</div>
          <div className="text-[11px] opacity-80">customer@example.com</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: design.brandLight }}>
          <div className="text-[10px] font-bold tracking-wider uppercase opacity-70">{design.paymentLabel}</div>
          <div className="text-sm mt-1"><span className="opacity-70">Method:</span> <span className="font-bold">bKash</span></div>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: design.brandColor }}>PAID</span>
        </div>
      </div>

      {/* Items table */}
      <div className="px-6 mt-4">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: design.headerBg, color: design.headerText }}>
              <th className="text-left px-3 py-2 font-bold w-8">#</th>
              <th className="text-left px-3 py-2 font-bold">{design.itemColumn.toUpperCase()}</th>
              <th className="text-right px-3 py-2 font-bold">{design.qtyColumn.toUpperCase()}</th>
              <th className="text-right px-3 py-2 font-bold">{design.priceColumn.toUpperCase()}</th>
              <th className="text-right px-3 py-2 font-bold">{design.totalColumn.toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2 text-right">x{it.qty}</td>
                <td className="px-3 py-2 text-right">{fmt(it.price)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmt(it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-6 mt-3 flex justify-end">
        <div className="w-64 rounded-xl p-3 space-y-1 text-xs" style={{ background: design.brandLight }}>
          <div className="flex justify-between"><span className="opacity-70">{design.subtotalRow}</span><span className="font-semibold">{fmt(subtotal)}</span></div>
          <div className="flex justify-between"><span className="opacity-70">{design.discountRow}</span><span className="font-semibold">−{fmt(discount)}</span></div>
          <div className="flex justify-between pt-1 border-t border-white/60 text-base">
            <span className="font-bold" style={{ color: totalColor }}>{design.grandTotalRow}:</span>
            <span className="font-extrabold" style={{ color: totalColor }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 mt-4 text-center border-t border-slate-100">
        <div className="text-sm font-bold" style={{ color: design.brandColor }}>{design.thankYouText}</div>
        <div className="text-[11px] opacity-70 mt-1 flex flex-wrap justify-center gap-x-3">
          {design.companyWebsite && <span>🌐 {design.companyWebsite}</span>}
          {design.companyEmail && <span>✉ {design.companyEmail}</span>}
          {design.companyPhone && <span>📞 {design.companyPhone}</span>}
        </div>
        <div className="text-[10px] opacity-60 mt-2">{design.footerNote}</div>
      </div>
    </div>
  );
}
