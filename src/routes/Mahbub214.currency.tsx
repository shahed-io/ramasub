import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Save, Loader2, Plus, Trash2, Coins, DollarSign, Sparkles, RefreshCw, Eye, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CURRENCIES,
  normalizeCurrencyConfig,
  type CurrencyDef,
} from "@/context/CurrencyContext";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/currency")({
  component: CurrencyManagerPage,
  head: () => ({
    meta: [
      { title: "Currency Manager · Admin" },
      { name: "description", content: "Manage site currencies, dollar rate and automatic price conversion." },
    ],
  }),
});

/** Ready-made currencies an admin can add with one click. */
const PRESETS: Array<Omit<CurrencyDef, "base">> = [
  { code: "USD", symbol: "$", label: "US Dollar", rate: 135, decimals: 2, enabled: true },
  { code: "EUR", symbol: "€", label: "Euro", rate: 145, decimals: 2, enabled: true },
  { code: "GBP", symbol: "£", label: "British Pound", rate: 170, decimals: 2, enabled: true },
  { code: "INR", symbol: "₹", label: "Indian Rupee", rate: 1.6, decimals: 2, enabled: true },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", rate: 36, decimals: 2, enabled: true },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal", rate: 36, decimals: 2, enabled: true },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit", rate: 29, decimals: 2, enabled: true },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", rate: 88, decimals: 2, enabled: true },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", rate: 98, decimals: 2, enabled: true },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", rate: 0.9, decimals: 0, enabled: true },
];

type PreviewProduct = { name: string; price: number };

function CurrencyManagerPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [switcherEnabled, setSwitcherEnabled] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyDef[]>(DEFAULT_CURRENCIES);
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [previewCode, setPreviewCode] = useState<string>("USD");

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, prodRes] = await Promise.all([
      supabase.from("admin_records").select("*").eq("kind", "currency_config").limit(1),
      supabase.from("products").select("name, plans").eq("is_active", true).order("sort_order").limit(60),
    ]);
    const row = cfgRes.data?.[0];
    if (row) {
      setRowId(row.id);
      const norm = normalizeCurrencyConfig(row.data);
      setSwitcherEnabled(norm.switcher_enabled);
      setCurrencies(norm.currencies);
    }
    const list: PreviewProduct[] = [];
    for (const p of prodRes.data ?? []) {
      const plans = Array.isArray(p.plans) ? (p.plans as Array<Record<string, unknown>>) : [];
      const prices = plans.map((pl) => Number(pl?.price)).filter((n) => Number.isFinite(n) && n > 0);
      if (prices.length) list.push({ name: String(p.name).trim(), price: Math.min(...prices) });
    }
    setProducts(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const baseDef = currencies.find((c) => c.base) ?? currencies[0]!;
  const nonBase = currencies.filter((c) => !c.base);
  const usdIndex = currencies.findIndex((c) => c.code === "USD");
  const usd = usdIndex >= 0 ? currencies[usdIndex]! : null;

  const previewDef = useMemo(
    () => currencies.find((c) => c.code === previewCode) ?? nonBase[0] ?? baseDef,
    [currencies, previewCode, nonBase, baseDef],
  );

  const updateCur = (index: number, patch: Partial<CurrencyDef>) =>
    setCurrencies((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const addCur = (preset?: Omit<CurrencyDef, "base">) => {
    if (preset && currencies.some((c) => c.code === preset.code)) {
      toast.error(`${preset.code} আগেই যোগ করা আছে।`);
      return;
    }
    setCurrencies((list) => [
      ...list,
      preset
        ? { ...preset, base: false }
        : { code: "", symbol: "", label: "", rate: 1, decimals: 2, enabled: true, base: false },
    ]);
    if (preset) setPreviewCode(preset.code);
  };

  const removeCur = (index: number) =>
    setCurrencies((list) => list.filter((_, i) => i !== index));

  const save = async () => {
    const bad = currencies.find((c) => !c.code.trim() || !c.symbol.trim() || !(Number(c.rate) > 0));
    if (bad) return toast.error("প্রতিটি কারেন্সির Code, Symbol এবং ০-এর বেশি রেট দিতে হবে।");
    const codes = currencies.map((c) => c.code.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) return toast.error("একই Code দুইবার ব্যবহার করা যাবে না।");

    setSaving(true);
    const clean = normalizeCurrencyConfig({ switcher_enabled: switcherEnabled, currencies });
    const payload = { kind: "currency_config", data: clean as never, is_active: true };
    const op = rowId
      ? supabase.from("admin_records").update(payload).eq("id", rowId)
      : supabase.from("admin_records").insert(payload).select().single();
    const { error, data: saved } = (await op) as { error: { message: string } | null; data: { id?: string } | null };
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!rowId && saved?.id) setRowId(saved.id);
    setSwitcherEnabled(clean.switcher_enabled);
    setCurrencies(clean.currencies);
    queryClient.invalidateQueries({ queryKey: ["currency-config"] });
    toast.success("সেভ হয়েছে ✅ সব প্রোডাক্টের দাম অটো-কনভার্ট হবে");
  };

  const conv = (base: number, def: CurrencyDef) => {
    const rate = Number(def.rate) > 0 ? Number(def.rate) : 1;
    const v = base / rate;
    return `${def.symbol}${v.toLocaleString("en-US", {
      minimumFractionDigits: def.decimals ?? 2,
      maximumFractionDigits: def.decimals ?? 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="grid place-items-center h-64" style={{ color: "var(--admin-muted)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[18px] border p-5 md:p-6"
        style={{
          borderColor: "var(--admin-border)",
          background:
            "linear-gradient(120deg,#ffffff 0%,#f7f4ff 45%,#eef2ff 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full opacity-60"
          style={{ background: "radial-gradient(circle,#ddd6fe 0%,transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl grid place-items-center text-white shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 12px 26px -12px rgba(124,58,237,.7)" }}>
              <Coins className="w-7 h-7" />
            </span>
            <div>
              <h2 className="text-2xl md:text-[28px] font-extrabold tracking-tight" style={{ color: "var(--admin-ink)" }}>
                Currency Manager
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-muted)" }}>
                একটাই রেট দিন — ওয়েবসাইটের <b>সব প্রোডাক্টের দাম</b> অটোমেটিক সেই কারেন্সিতে দেখাবে।
              </p>
            </div>
          </div>
          <button onClick={save} disabled={saving} className="a-save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            সেভ করুন
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Base Currency" value={`${baseDef.symbol} ${baseDef.code}`} tone="violet" />
          <Stat label="মোট কারেন্সি" value={String(currencies.length)} tone="indigo" />
          <Stat label="চালু আছে" value={String(currencies.filter((c) => c.base || c.enabled !== false).length)} tone="emerald" />
          <Stat label="প্রোডাক্ট (auto-convert)" value={String(products.length)} tone="amber" />
        </div>
      </div>

      {/* Quick dollar rate */}
      <Card>
        <SectionTitle icon={<DollarSign className="w-4 h-4" />} title="ডলার রেট (Quick set)"
          sub="এখানে ১ ডলার = কত টাকা দিন। সেভ করলেই সব প্রোডাক্টের ডলার দাম অটো হিসাব হবে।" />
        {usd ? (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--admin-muted)" }}>
                ১ USD = কত ৳
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-violet-600">৳</span>
                <input
                  type="number"
                  value={String(usd.rate ?? 135)}
                  onChange={(e) => updateCur(usdIndex, { rate: Number(e.target.value) || 0 })}
                  className="w-full h-14 rounded-2xl border pl-9 pr-3 text-2xl font-extrabold outline-none transition focus:ring-4"
                  style={{ borderColor: "#ddd6fe", background: "#fff", color: "var(--admin-ink)" }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {[120, 125, 130, 135, 140].map((r) => (
                <button key={r} type="button" onClick={() => updateCur(usdIndex, { rate: r })}
                  className="h-10 px-3 rounded-full text-xs font-bold border transition"
                  style={{
                    borderColor: Number(usd.rate) === r ? "#7c3aed" : "var(--admin-border)",
                    background: Number(usd.rate) === r ? "#f5f3ff" : "#fff",
                    color: Number(usd.rate) === r ? "#6d28d9" : "var(--admin-text)",
                  }}>
                  ৳{r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => addCur(PRESETS[0])}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <Plus className="w-4 h-4" /> USD ($) যোগ করুন
          </button>
        )}
      </Card>

      {/* Live preview */}
      <Card>
        <SectionTitle icon={<Eye className="w-4 h-4" />} title="লাইভ প্রিভিউ"
          sub="আসল প্রোডাক্টের দাম কনভার্ট হয়ে কেমন দেখাবে" />
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {nonBase.map((c) => (
            <button key={c.code} type="button" onClick={() => setPreviewCode(c.code)}
              className="h-9 px-3.5 rounded-full text-xs font-bold border transition"
              style={{
                borderColor: previewDef.code === c.code ? "#7c3aed" : "var(--admin-border)",
                background: previewDef.code === c.code ? "#f5f3ff" : "#fff",
                color: previewDef.code === c.code ? "#6d28d9" : "var(--admin-text)",
              }}>
              {c.symbol} {c.code || "NEW"}
            </button>
          ))}
          <button type="button" onClick={load}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold"
            style={{ background: "var(--admin-hover)", color: "var(--admin-text)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
          </button>
        </div>
        {products.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--admin-muted)" }}>কোনো অ্যাক্টিভ প্রোডাক্ট পাওয়া যায়নি।</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-auto pr-1">
            {products.map((p) => (
              <div key={p.name} className="rounded-xl border p-3 flex items-center justify-between gap-3"
                style={{ borderColor: "var(--admin-border)", background: "#fcfcff" }}>
                <span className="text-xs font-semibold truncate" style={{ color: "var(--admin-text)" }} title={p.name}>
                  {p.name}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px]" style={{ color: "var(--admin-muted)" }}>
                    {baseDef.symbol}{p.price.toLocaleString("en-US")}
                  </span>
                  <span className="block text-sm font-extrabold text-violet-700">{conv(p.price, previewDef)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Currency list */}
      <Card>
        <SectionTitle icon={<Coins className="w-4 h-4" />} title="কারেন্সি লিস্ট"
          sub="যত ইচ্ছা কারেন্সি যোগ করুন — সব প্রাইস ৳ (BDT)-তে সেভ থাকে, দেখানোর সময় অটো কনভার্ট হয়" />

        <label className="mb-4 flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={switcherEnabled}
            onChange={(e) => setSwitcherEnabled(e.target.checked)} className="w-4 h-4 accent-violet-600" />
          <span className="text-sm font-semibold" style={{ color: "var(--admin-ink)" }}>
            হেডারে কারেন্সি সুইচার দেখান (বন্ধ করলে শুধু ৳ দেখাবে)
          </span>
        </label>

        <div className="space-y-3">
          {currencies.map((c, i) => (
            <div key={i} className="rounded-2xl border p-3.5 transition"
              style={{
                borderColor: c.base ? "#ddd6fe" : "var(--admin-border)",
                background: c.base ? "linear-gradient(120deg,#faf8ff,#ffffff)" : "#ffffff",
              }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--admin-ink)" }}>
                  <span className="w-9 h-9 rounded-xl grid place-items-center font-black text-white"
                    style={{ background: c.base ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "linear-gradient(135deg,#a78bfa,#818cf8)" }}>
                    {c.symbol || "¤"}
                  </span>
                  {c.code || "NEW"}
                  {c.base && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      DEFAULT / BASE
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: "var(--admin-text)" }}>
                    <input type="checkbox" checked={c.base ? true : c.enabled !== false} disabled={c.base}
                      onChange={(e) => updateCur(i, { enabled: e.target.checked })} className="w-4 h-4 accent-violet-600" />
                    চালু
                  </label>
                  {!c.base && (
                    <button type="button" onClick={() => removeCur(i)}
                      className="w-8 h-8 grid place-items-center rounded-lg border transition hover:bg-rose-50 hover:text-rose-600"
                      style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted)" }} title="ডিলিট">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Field label="Code">
                  <Input value={c.code} onChange={(v) => updateCur(i, { code: v.toUpperCase().slice(0, 6) })} placeholder="USD" />
                </Field>
                <Field label="Symbol">
                  <Input value={c.symbol} onChange={(v) => updateCur(i, { symbol: v.slice(0, 4) })} placeholder="$" />
                </Field>
                <Field label="নাম">
                  <Input value={c.label} onChange={(v) => updateCur(i, { label: v })} placeholder="US Dollar" />
                </Field>
                <Field label={c.base ? "রেট (base = 1)" : `রেট (১ ${c.code || "?"} = কত ৳)`}>
                  <Input type="number" value={String(c.rate ?? 1)}
                    onChange={(v) => updateCur(i, { rate: Number(v) || 0 })} placeholder="135" />
                </Field>
                <Field label="দশমিক ঘর">
                  <Input type="number" value={String(c.decimals ?? 2)}
                    onChange={(v) => updateCur(i, { decimals: Math.min(4, Math.max(0, Number(v) || 0)) })} placeholder="2" />
                </Field>
              </div>

              {!c.base && Number(c.rate) > 0 && (
                <p className="text-[11px] mt-2" style={{ color: "var(--admin-muted)" }}>
                  উদাহরণ: ৳499 → <b>{conv(499, c)}</b> · ৳1,999 → <b>{conv(1999, c)}</b>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold mb-2 inline-flex items-center gap-1.5" style={{ color: "var(--admin-muted)" }}>
            <Sparkles className="w-3.5 h-3.5 text-violet-500" /> এক ক্লিকে যোগ করুন
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const added = currencies.some((c) => c.code === p.code);
              return (
                <button key={p.code} type="button" disabled={added} onClick={() => addCur(p)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold border transition disabled:opacity-60"
                  style={{
                    borderColor: added ? "#ddd6fe" : "var(--admin-border)",
                    background: added ? "#f5f3ff" : "#fff",
                    color: added ? "#6d28d9" : "var(--admin-text)",
                  }}>
                  {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {p.symbol} {p.code}
                </button>
              );
            })}
            <button type="button" onClick={() => addCur()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <Plus className="w-3.5 h-3.5" /> কাস্টম কারেন্সি
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] border p-4 md:p-5"
      style={{ borderColor: "var(--admin-border)", background: "#fff", boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-1.5 self-stretch rounded-full" style={{ background: "linear-gradient(#7c3aed,#4f46e5)" }} />
      <div>
        <h3 className="text-base font-extrabold inline-flex items-center gap-2" style={{ color: "var(--admin-ink)" }}>
          <span className="text-violet-600">{icon}</span> {title}
        </h3>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--admin-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

const TONES: Record<string, { bg: string; ink: string }> = {
  violet: { bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", ink: "#6d28d9" },
  indigo: { bg: "linear-gradient(135deg,#eef2ff,#e0e7ff)", ink: "#4338ca" },
  emerald: { bg: "linear-gradient(135deg,#ecfdf5,#d1fae5)", ink: "#047857" },
  amber: { bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", ink: "#b45309" },
};

function Stat({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONES }) {
  const t = TONES[tone] ?? TONES.violet!;
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--admin-border)", background: t.bg }}>
      <p className="text-[11px] font-semibold" style={{ color: "var(--admin-muted)" }}>{label}</p>
      <p className="text-xl font-extrabold mt-0.5" style={{ color: t.ink }}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold" style={{ color: "var(--admin-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-xl border px-3 text-sm outline-none transition focus:ring-2"
      style={{ borderColor: "var(--admin-border)", background: "#fff", color: "var(--admin-ink)" }}
    />
  );
}
