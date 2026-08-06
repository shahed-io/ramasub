import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Plus, Trash2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CURRENCIES,
  normalizeCurrencyConfig,
  type CurrencyDef,
} from "@/context/CurrencyContext";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/currency")({
  component: CurrencyManagerPage,
});

function CurrencyManagerPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [switcherEnabled, setSwitcherEnabled] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyDef[]>(DEFAULT_CURRENCIES);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_records")
      .select("*")
      .eq("kind", "currency_config")
      .limit(1);
    const row = data?.[0];
    if (row) {
      setRowId(row.id);
      const norm = normalizeCurrencyConfig(row.data);
      setSwitcherEnabled(norm.switcher_enabled);
      setCurrencies(norm.currencies);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCur = (index: number, patch: Partial<CurrencyDef>) =>
    setCurrencies((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const addCur = () =>
    setCurrencies((list) => [
      ...list,
      { code: "", symbol: "", label: "", rate: 1, decimals: 2, enabled: true, base: false },
    ]);

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
    const { error, data: saved } = (await op) as any;
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!rowId && saved?.id) setRowId(saved.id);
    setSwitcherEnabled(clean.switcher_enabled);
    setCurrencies(clean.currencies);
    queryClient.invalidateQueries({ queryKey: ["currency-config"] });
    toast.success("কারেন্সি সেটিংস সংরক্ষিত ✅");
  };

  if (loading) {
    return (
      <div className="grid place-items-center h-64" style={{ color: "var(--admin-muted)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-violet-100 grid place-items-center text-violet-700">
            <Coins className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--admin-ink)" }}>
              Currency Manager
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--admin-muted)" }}>
              টাকা / ডলার সহ যত ইচ্ছা কারেন্সি — চালু, বন্ধ ও রেট কন্ট্রোল
            </p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="a-save-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          কারেন্সি সেভ করুন
        </button>
      </div>

      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{ borderColor: "var(--admin-border)", background: "#fff" }}
      >
        <p className="text-xs mb-3" style={{ color: "var(--admin-muted)" }}>
          সব প্রাইস <b>বাংলাদেশি টাকা (৳ BDT)</b>-তে সেভ থাকে এবং ডিফল্টভাবে ৳-তেই দেখায়।
          কাস্টমার অন্য কারেন্সি সিলেক্ট করলে নিচের রেট দিয়ে অটো-কনভার্ট হয়ে দেখাবে।
        </p>

        <label className="mb-4 flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={switcherEnabled}
            onChange={(e) => setSwitcherEnabled(e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
          <span className="text-sm font-semibold" style={{ color: "var(--admin-ink)" }}>
            হেডারে কারেন্সি সুইচার দেখান (বন্ধ করলে শুধু ৳ দেখাবে)
          </span>
        </label>

        <div className="space-y-3">
          {currencies.map((c, i) => (
            <div
              key={i}
              className="rounded-xl border p-3.5"
              style={{ borderColor: "var(--admin-border)", background: c.base ? "#faf8ff" : "#ffffff" }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--admin-ink)" }}>
                  <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 grid place-items-center font-black">
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
                  <label
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    style={{ color: "var(--admin-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={c.base ? true : c.enabled !== false}
                      disabled={c.base}
                      onChange={(e) => updateCur(i, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-violet-600"
                    />
                    চালু
                  </label>
                  {!c.base && (
                    <button
                      type="button"
                      onClick={() => removeCur(i)}
                      className="w-8 h-8 grid place-items-center rounded-lg border transition"
                      style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted)" }}
                      title="ডিলিট"
                    >
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
                  <Input
                    type="number"
                    value={String(c.rate ?? 1)}
                    onChange={(v) => updateCur(i, { rate: Number(v) || 0 })}
                    placeholder="135"
                  />
                </Field>
                <Field label="দশমিক ঘর">
                  <Input
                    type="number"
                    value={String(c.decimals ?? 2)}
                    onChange={(v) => updateCur(i, { decimals: Math.min(4, Math.max(0, Number(v) || 0)) })}
                    placeholder="2"
                  />
                </Field>
              </div>

              {!c.base && Number(c.rate) > 0 && (
                <p className="text-[11px] mt-2" style={{ color: "var(--admin-muted)" }}>
                  উদাহরণ: ৳499 → <b>{c.symbol}{(499 / Number(c.rate)).toFixed(c.decimals ?? 2)}</b>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={addCur}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold transition"
            style={{ background: "var(--admin-hover)", color: "var(--admin-text)" }}
          >
            <Plus className="w-3.5 h-3.5" /> নতুন কারেন্সি অ্যাড
          </button>
          <button onClick={save} disabled={saving} className="a-save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            কারেন্সি সেভ করুন
          </button>
        </div>

        <div
          className="mt-4 rounded-xl border p-3 text-[11px]"
          style={{ borderColor: "var(--admin-border)", background: "#faf8ff", color: "var(--admin-text)" }}
        >
          <ul className="list-disc pl-5 space-y-0.5">
            <li>ডিফল্ট কারেন্সি সবসময় বাংলাদেশি টাকা (৳ BDT) — নতুন ভিজিটর ৳-ই দেখবে।</li>
            <li>প্রাইস সবসময় BDT-তে সেভ হয় — শুধু ডিসপ্লে কনভার্ট হয়।</li>
            <li>পেমেন্ট সবসময় BDT-তে প্রসেস হয়।</li>
            <li>একটা কারেন্সি বন্ধ করলে যারা ওইটা সিলেক্ট করেছিল, তারা অটো ৳-তে ফিরে আসবে।</li>
          </ul>
        </div>
      </div>
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
      style={{
        borderColor: "var(--admin-border)",
        background: "#fff",
        color: "var(--admin-ink)",
      }}
    />
  );
}
