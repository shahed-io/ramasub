import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Loader2,
  Search,
  Check,
  X,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

type Review = {
  id: string;
  product_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

type Tab = "pending" | "approved" | "rejected" | "all";

function StarRow({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function AdminReviewsPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("approved");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, product_slug, reviewer_name, rating, comment, is_approved, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Review[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const pending = rows.filter((r) => !r.is_approved).length;
    const approved = rows.filter((r) => r.is_approved).length;
    return { pending, approved, rejected: 0 };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "pending" && r.is_approved) return false;
      if (tab === "approved" && !r.is_approved) return false;
      if (tab === "rejected") return false;
      if (!q) return true;
      return (
        r.reviewer_name.toLowerCase().includes(q) ||
        r.product_slug.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q)
      );
    });
  }, [rows, tab, query]);

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: true })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Approved", "অনুমোদিত"));
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: true } : r)),
    );
  };

  const unapprove = async (id: string) => {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Moved to pending", "অপেক্ষমাণ-এ সরানো হয়েছে"));
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: false } : r)),
    );
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this review?", "এই রিভিউ মুছে ফেলবেন?"))) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {t("Product Reviews", "প্রোডাক্ট রিভিউ")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("Moderate customer product reviews", "গ্রাহকদের পণ্য রিভিউ মডারেশন")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          ring="ring-amber-100"
          value={counts.pending}
          label={t("Pending", "অপেক্ষায়")}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          ring="ring-emerald-100"
          value={counts.approved}
          label={t("Approved", "অনুমোদিত")}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-rose-500" />}
          ring="ring-rose-100"
          value={counts.rejected}
          label={t("Rejected", "প্রত্যাখ্যাত")}
        />
      </div>

      {/* Search + tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search reviews or products…", "রিভিউ বা প্রোডাক্ট খুঁজুন…")}
            className="w-full h-11 pl-11 pr-4 rounded-full border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="inline-flex flex-wrap gap-2">
          {([
            ["pending", t("Pending", "অপেক্ষায়")],
            ["approved", t("Approved", "অনুমোদিত")],
            ["rejected", t("Rejected", "প্রত্যাখ্যাত")],
            ["all", t("All", "সব")],
          ] as const).map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={`h-10 px-4 rounded-full text-sm font-semibold transition border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t("Loading…", "লোড হচ্ছে…")}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500 shadow-sm">
            {t("No reviews to show.", "দেখানোর মতো কোনো রিভিউ নেই।")}
          </div>
        ) : (
          visible.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.reviewer_name}</span>
                    <StarRow value={r.rating} />
                    <StatusBadge approved={r.is_approved} t={t} />
                  </div>
                  <Link
                    to="/product/$slug"
                    params={{ slug: r.product_slug }}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium break-all"
                  >
                    {r.product_slug}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{r.comment}</p>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {new Date(r.created_at).toLocaleDateString(
                      t("en-US", "bn-BD"),
                      { year: "numeric", month: "numeric", day: "numeric" },
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.is_approved ? (
                    <button
                      onClick={() => unapprove(r.id)}
                      title={t("Unapprove", "অনুমোদন বাতিল")}
                      className="w-9 h-9 grid place-items-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => approve(r.id)}
                      title={t("Approve", "অনুমোদন")}
                      className="w-9 h-9 grid place-items-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    title={t("Delete", "মুছুন")}
                    className="w-9 h-9 grid place-items-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  ring,
  value,
  label,
}: {
  icon: React.ReactNode;
  ring: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center">
      <span
        className={`w-9 h-9 rounded-full bg-white ring-1 ${ring} grid place-items-center mb-2`}
      >
        {icon}
      </span>
      <div className="text-3xl font-extrabold text-slate-900 leading-none">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ approved, t }: { approved: boolean; t: (en: string, bn: string) => string }) {
  return approved ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
      {t("Approved", "অনুমোদিত")}
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
      {t("Pending", "অপেক্ষায়")}
    </span>
  );
}
