import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Palette, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, type ThemeId } from "@/context/ThemeContext";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/themes")({
  component: AdminThemesPage,
  head: () => ({ meta: [{ title: "Themes — Admin" }] }),
});

type Row = { id: string; data: { id: ThemeId; name?: string; description?: string }; is_active: boolean };

function AdminThemesPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [defaultId, setDefaultId] = useState<string | null>(null); // admin_records row id
  const [defaultTheme, setDefaultTheme] = useState<ThemeId>("white");
  const [savingDefault, setSavingDefault] = useState<ThemeId | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: cfg, error: e1 }, { data: def, error: e2 }] = await Promise.all([
        supabase.from("admin_records").select("id,data,is_active").eq("kind", "theme_config").order("sort_order"),
        supabase.from("admin_records").select("id,data").eq("kind", "theme_default").limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      if (e1) toast.error(e1.message);
      else setRows((cfg ?? []) as Row[]);
      if (e2 && e2.code !== "PGRST116") toast.error(e2.message);
      if (def) {
        setDefaultId(def.id);
        const id = (def.data as { id?: string } | null)?.id;
        if (id === "aurora" || id === "white") setDefaultTheme(id);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggle = async (row: Row) => {
    if (row.data.id === "white" && row.is_active) {
      toast.error(t("White theme cannot be disabled — it is the default fallback.", "White theme বন্ধ করা যাবে না — এটি default fallback।"));
      return;
    }
    if (row.data.id === defaultTheme && row.is_active) {
      toast.error(t("Cannot disable the default theme. Set another default first.", "Default theme বন্ধ করা যাবে না। আগে অন্য একটি default করুন।"));
      return;
    }
    setSaving(row.id);
    const next = !row.is_active;
    const { error } = await supabase.from("admin_records").update({ is_active: next }).eq("id", row.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    toast.success(next
      ? t(`${row.data.name ?? row.data.id} enabled`, `${row.data.name ?? row.data.id} চালু করা হয়েছে`)
      : t(`${row.data.name ?? row.data.id} disabled`, `${row.data.name ?? row.data.id} বন্ধ করা হয়েছে`));
  };

  const makeDefault = async (row: Row) => {
    if (!row.is_active) {
      toast.error(t("Enable the theme before setting it as default.", "Default করার আগে theme টি চালু করুন।"));
      return;
    }
    setSavingDefault(row.data.id);
    let error;
    if (defaultId) {
      ({ error } = await supabase.from("admin_records").update({ data: { id: row.data.id }, is_active: true }).eq("id", defaultId));
    } else {
      const ins = await supabase
        .from("admin_records")
        .insert({ kind: "theme_default", data: { id: row.data.id }, is_active: true, sort_order: 0 })
        .select("id")
        .single();
      error = ins.error;
      if (ins.data) setDefaultId(ins.data.id);
    }
    setSavingDefault(null);
    if (error) { toast.error(error.message); return; }
    setDefaultTheme(row.data.id);
    toast.success(t(`${row.data.name ?? row.data.id} is now the default`, `${row.data.name ?? row.data.id} এখন default theme`));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-md">
            <Palette className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("System", "সিস্টেম")}</div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">{t("Themes", "থিম")}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t(
                "Turn themes on/off and pick the default theme new visitors see. Visitors who haven't manually changed the theme will follow this default automatically.",
                "Theme গুলো on/off করুন এবং নতুন visitor কোন theme দেখবে সেই default theme নির্বাচন করুন। যারা নিজে theme পরিবর্তন করেননি তারা স্বয়ংক্রিয়ভাবে এই default টি দেখবে।"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{t("No themes configured.", "কোনো theme configure করা নেই।")}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => {
              const meta = THEMES.find((th) => th.id === row.data.id);
              const isWhite = row.data.id === "white";
              const isBusy = saving === row.id;
              const isDefault = defaultTheme === row.data.id;
              const isSavingDefault = savingDefault === row.data.id;
              return (
                <li key={row.id} className="flex items-center gap-4 p-5">
                  <span
                    aria-hidden
                    className="shrink-0 w-12 h-12 rounded-xl ring-1 ring-slate-200 shadow-inner"
                    style={{ backgroundImage: meta?.swatch ?? "linear-gradient(135deg,#888,#444)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{row.data.name ?? row.data.id}</span>
                      {row.is_active && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <Check className="w-3 h-3" /> {t("Enabled", "চালু")}
                        </span>
                      )}
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {t("Default", "ডিফল্ট")}
                        </span>
                      )}
                      {isWhite && !isDefault && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                          {t("Fallback", "Fallback")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{row.data.description ?? meta?.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isDefault || !row.is_active || isSavingDefault}
                    onClick={() => makeDefault(row)}
                    className={[
                      "inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors",
                      isDefault
                        ? "bg-amber-50 border-amber-200 text-amber-700 cursor-default"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      (!row.is_active || isSavingDefault) ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    title={!row.is_active ? t("Enable first", "আগে চালু করুন") : undefined}
                  >
                    {isSavingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${isDefault ? "fill-amber-500 text-amber-500" : ""}`} />}
                    {isDefault ? t("Default", "Default") : t("Make default", "Default করুন")}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy || (isWhite && row.is_active) || (isDefault && row.is_active)}
                    onClick={() => toggle(row)}
                    aria-pressed={row.is_active}
                    title={
                      isWhite && row.is_active
                        ? t("White theme cannot be disabled", "White theme বন্ধ করা যাবে না")
                        : isDefault && row.is_active
                          ? t("Default theme cannot be disabled", "Default theme বন্ধ করা যাবে না")
                          : undefined
                    }
                    className={[
                      "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      row.is_active ? "bg-emerald-500" : "bg-slate-300",
                      (isBusy || (isWhite && row.is_active) || (isDefault && row.is_active)) ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition",
                        row.is_active ? "translate-x-5" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
