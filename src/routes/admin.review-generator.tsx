import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Star, Loader2, RefreshCw, Trash2, Wand2, X, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminGlassCard, AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { useAdminLang } from "@/context/AdminLangContext";


export const Route = createFileRoute("/admin/review-generator")({
  component: AdminReviewGenerator,
});

type ProductRow = { slug: string; name: string; category: string | null; tagline: string | null };
type ReviewRow = {
  id: string;
  product_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};
type GenLang = "bn" | "en" | "mixed";
type GenBias = "high" | "balanced";

const FN_URL = "https://mjclnbroetlwibeofssz.supabase.co/functions/v1/review-generator";

function AdminReviewGenerator() {
  const { t } = useAdminLang();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState("");

  const [perProduct, setPerProduct] = useState(5);
  const [language, setLanguage] = useState<GenLang>("mixed");
  const [ratingBias, setRatingBias] = useState<GenBias>("high");
  const [autoApprove, setAutoApprove] = useState(true);
  const [skipIfHas, setSkipIfHas] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("products").select("slug,name,category,tagline").order("name"),
      supabase.from("product_reviews").select("id,product_slug,reviewer_name,rating,comment,is_approved,created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    setProducts((ps as ProductRow[]) ?? []);
    setReviews((rs as ReviewRow[]) ?? []);
    const c: Record<string, number> = {};
    for (const r of (rs as ReviewRow[]) ?? []) c[r.product_slug] = (c[r.product_slug] ?? 0) + 1;
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.is_approved).length;
    const avg = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : "0.00";
    const productsWith = Object.keys(counts).length;
    return { total, approved, avg, productsWith };
  }, [reviews, counts]);

  async function generateFor(p: ProductRow): Promise<{ inserted: number; skipped?: boolean } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          product: { name: p.name, category: p.category ?? undefined, tagline: p.tagline ?? undefined },
          count: perProduct,
          language,
          ratingBias,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `AI error (${res.status})`);
      const arr: Array<{ reviewer_name: string; rating: number; comment: string }> = body?.reviews ?? [];
      if (!arr.length) throw new Error("No reviews returned");
      const rows = arr.map((r) => ({
        product_slug: p.slug,
        reviewer_name: String(r.reviewer_name).slice(0, 80),
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
        comment: String(r.comment).slice(0, 1000),
        is_approved: autoApprove,
      }));
      const { error } = await supabase.from("product_reviews").insert(rows);
      if (error) throw error;
      return { inserted: rows.length };
    } catch (e: any) {
      toast.error(`${p.name}: ${e.message ?? "failed"}`);
      return null;
    }
  }

  async function onGenerateOne(p: ProductRow) {
    setBusy((s) => ({ ...s, [p.slug]: true }));
    const r = await generateFor(p);
    setBusy((s) => ({ ...s, [p.slug]: false }));
    if (r) {
      toast.success(t(`Generated ${r.inserted} reviews for ${p.name}`, `${p.name}-এর জন্য ${r.inserted}টি রিভিউ তৈরি হয়েছে`));
      refresh();
    }
  }

  async function onGenerateAll() {
    if (!filtered.length) return;
    if (!confirm(t(
      `Generate ${perProduct} reviews for ${filtered.length} products?`,
      `${filtered.length}টি প্রোডাক্টের জন্য প্রতিটিতে ${perProduct}টি রিভিউ তৈরি করবেন?`,
    ))) return;
    setBulkBusy(true);
    let total = 0, done = 0, skipped = 0;
    for (const p of filtered) {
      if (skipIfHas && (counts[p.slug] ?? 0) > 0) { skipped++; continue; }
      setBusy((s) => ({ ...s, [p.slug]: true }));
      const r = await generateFor(p);
      setBusy((s) => ({ ...s, [p.slug]: false }));
      if (r) { total += r.inserted; done++; }
      await new Promise((r) => setTimeout(r, 350));
    }
    setBulkBusy(false);
    toast.success(t(
      `Done. ${done} products, ${total} reviews. Skipped ${skipped}.`,
      `সম্পন্ন। ${done}টি প্রোডাক্ট, ${total}টি রিভিউ। বাদ ${skipped}টি।`,
    ));
    refresh();
  }

  async function deleteFor(p: ProductRow) {
    if (!confirm(t(`Delete all reviews for ${p.name}?`, `${p.name}-এর সকল রিভিউ মুছবেন?`))) return;
    const { error } = await supabase.from("product_reviews").delete().eq("product_slug", p.slug);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    refresh();
  }

  return (
    <div className="space-y-5">
      <AdminGlassCard className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t("AI Review Generator", "AI রিভিউ জেনারেটর")}</h1>
              <p className="text-sm text-slate-500">{t("Auto-generate realistic customer reviews for every product.", "প্রত্যেক প্রোডাক্টের জন্য বাস্তবধর্মী রিভিউ অটো তৈরি করুন।")}</p>
            </div>
          </div>
          <button
            onClick={onGenerateAll}
            disabled={bulkBusy || loading}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold inline-flex items-center gap-2 shadow hover:opacity-95 disabled:opacity-60"
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {t("Generate for all", "সবার জন্য জেনারেট")}
          </button>
        </div>
      </AdminGlassCard>

      <AdminStatGrid>
        <AdminStatCard label={t("Total reviews", "মোট রিভিউ")} value={String(stats.total)} tone="amber" />
        <AdminStatCard label={t("Approved", "অনুমোদিত")} value={String(stats.approved)} tone="emerald" />
        <AdminStatCard label={t("Avg rating", "গড় রেটিং")} value={stats.avg} tone="amber" />
        <AdminStatCard label={t("Products with reviews", "রিভিউ যুক্ত প্রোডাক্ট")} value={`${stats.productsWith}/${products.length}`} tone="violet" />
      </AdminStatGrid>

      <AdminGlassCard className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span>{t("Reviews per product", "প্রতি প্রোডাক্ট")}</span>
            <input type="number" min={1} max={20} value={perProduct}
              onChange={(e) => setPerProduct(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span>{t("Language", "ভাষা")}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as GenLang)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-normal bg-white">
              <option value="mixed">{t("Mixed (Bangla + English)", "মিশ্র (বাংলা + ইংরেজি)")}</option>
              <option value="bn">{t("Bangla only", "শুধু বাংলা")}</option>
              <option value="en">{t("English only", "শুধু ইংরেজি")}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span>{t("Rating style", "রেটিং স্টাইল")}</span>
            <select value={ratingBias} onChange={(e) => setRatingBias(e.target.value as GenBias)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-normal bg-white">
              <option value="high">{t("Mostly 5★ (4-5)", "বেশিরভাগ ৫★")}</option>
              <option value="balanced">{t("Balanced (3-5)", "ব্যালেন্সড (৩-৫)")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-5 md:mt-0 md:self-end h-10">
            <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
            {t("Auto-approve", "অটো-অনুমোদন")}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-5 md:mt-0 md:self-end h-10">
            <input type="checkbox" checked={skipIfHas} onChange={(e) => setSkipIfHas(e.target.checked)} />
            {t("Skip if already has", "থাকলে বাদ দাও")}
          </label>
        </div>
      </AdminGlassCard>

      <AdminGlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200/70 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search products…", "প্রোডাক্ট খুঁজুন…")}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm" />
          </div>
          <button onClick={refresh} className="h-10 px-3 rounded-lg border border-slate-200 text-sm inline-flex items-center gap-2 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />{t("Loading…", "লোড হচ্ছে…")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("Product", "প্রোডাক্ট")}</th>
                  <th className="px-4 py-3 w-32">{t("Reviews", "রিভিউ")}</th>
                  <th className="px-4 py-3 w-72 text-right">{t("Actions", "অ্যাকশন")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const c = counts[p.slug] ?? 0;
                  const b = !!busy[p.slug];
                  return (
                    <tr key={p.slug} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.category ?? "—"} · {p.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          <Star className="w-3 h-3" /> {c}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => onGenerateOne(p)}
                            disabled={b || bulkBusy}
                            className="h-9 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                          >
                            {b ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            {t("Generate", "জেনারেট")}
                          </button>
                          {c > 0 && (
                            <button
                              onClick={() => deleteFor(p)}
                              className="h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold inline-flex items-center gap-1 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {t("Clear", "মুছুন")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500">{t("No products found.", "কোনো প্রোডাক্ট নেই।")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </AdminGlassCard>

      {/* Recent generated reviews */}
      <AdminGlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">{t("Recent reviews", "সাম্প্রতিক রিভিউ")}</h2>
          <span className="text-xs text-slate-500">{reviews.length}</span>
        </div>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {reviews.slice(0, 50).map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center text-xs font-bold shrink-0">
                {r.reviewer_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{r.reviewer_name}</span>
                  <span className="text-amber-500 text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-[11px] text-slate-400">{r.product_slug}</span>
                  {!r.is_approved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">{t("pending", "পেন্ডিং")}</span>}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{r.comment}</p>
              </div>
              <button
                onClick={async () => {
                  await supabase.from("product_reviews").delete().eq("id", r.id);
                  refresh();
                }}
                className="text-slate-400 hover:text-rose-600"
                aria-label="Delete"
              ><X className="w-4 h-4" /></button>
            </div>
          ))}
          {!reviews.length && <div className="text-center text-slate-400 text-sm py-8">{t("No reviews yet.", "এখনো কোনো রিভিউ নেই।")}</div>}
        </div>
      </AdminGlassCard>
    </div>
  );
}
