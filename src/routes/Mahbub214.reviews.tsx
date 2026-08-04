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
  Pencil,
  MessageSquareReply,
  Save,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/reviews")({
  component: AdminReviewsPage,
});

type ReviewStatus = "pending" | "approved" | "rejected";

type Review = {
  id: string;
  product_slug: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  status: ReviewStatus;
  admin_reply: string | null;
  admin_reply_at: string | null;
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
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select(
        "id, product_slug, reviewer_name, rating, comment, is_approved, status, admin_reply, admin_reply_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data as unknown as Review[]) ?? []).map((r) => ({
      ...r,
      status: (r.status as ReviewStatus) || (r.is_approved ? "approved" : "pending"),
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!q) return true;
      return (
        r.reviewer_name.toLowerCase().includes(q) ||
        r.product_slug.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        (r.admin_reply?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, tab, query]);

  async function updateStatus(id: string, status: ReviewStatus) {
    setBusy(id);
    const patch = { status, is_approved: status === "approved" };
    const { error } = await supabase.from("product_reviews").update(patch).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    toast.success(
      status === "approved"
        ? t("Approved", "অনুমোদিত")
        : status === "rejected"
        ? t("Rejected", "প্রত্যাখ্যাত")
        : t("Moved to pending", "অপেক্ষমাণ-এ সরানো হয়েছে"),
    );
  }

  async function remove(id: string) {
    if (!confirm(t("Delete this review?", "এই রিভিউ মুছে ফেলবেন?"))) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
  }

  function startEdit(r: Review) {
    setEditing(r.id);
    setEditText(r.comment);
    setReplying(null);
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return toast.error(t("Comment cannot be empty", "মন্তব্য ফাঁকা রাখা যাবে না"));
    setBusy(id);
    const { error } = await supabase
      .from("product_reviews")
      .update({ comment: body })
      .eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, comment: body } : r)));
    setEditing(null);
    toast.success(t("Updated", "আপডেট হয়েছে"));
  }

  function startReply(r: Review) {
    setReplying(r.id);
    setReplyText(r.admin_reply || "");
    setEditing(null);
  }

  async function saveReply(id: string) {
    const body = replyText.trim();
    setBusy(id);
    const patch = {
      admin_reply: body || null,
      admin_reply_at: body ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("product_reviews").update(patch).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setReplying(null);
    toast.success(body ? t("Reply saved", "উত্তর সেভ হয়েছে") : t("Reply cleared", "উত্তর মুছে ফেলা হয়েছে"));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {t("Product Reviews", "প্রোডাক্ট রিভিউ")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("Moderate customer product reviews", "গ্রাহকদের পণ্য রিভিউ মডারেশন")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          ring="ring-blue-100"
          value={counts.pending}
          label={t("Pending", "অপেক্ষায়")}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
          ring="ring-blue-100"
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search reviews or products…", "রিভিউ বা প্রোডাক্ট খুঁজুন…")}
            className="w-full h-11 pl-11 pr-4 rounded-full border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="inline-flex flex-wrap gap-2">
          {(
            [
              ["pending", t("Pending", "অপেক্ষায়")],
              ["approved", t("Approved", "অনুমোদিত")],
              ["rejected", t("Rejected", "প্রত্যাখ্যাত")],
              ["all", t("All", "সব")],
            ] as const
          ).map(([key, label]) => {
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
                    <StatusBadge status={r.status} t={t} />
                    {r.admin_reply && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                        <MessageSquareReply className="w-3 h-3" />
                        {t("Replied", "উত্তর দেওয়া")}
                      </span>
                    )}
                  </div>
                  <Link
                    to="/product/$slug"
                    params={{ slug: r.product_slug }}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium break-all"
                  >
                    {r.product_slug}
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {editing === r.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t("Save", "সেভ")}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center h-9 px-3 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {t("Cancel", "বাতিল")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {r.comment}
                    </p>
                  )}

                  {r.admin_reply && replying !== r.id && (
                    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700">
                        <MessageSquareReply className="w-3.5 h-3.5" />
                        {t("Admin reply", "অ্যাডমিন উত্তর")}
                        {r.admin_reply_at && (
                          <span className="text-sky-500 font-medium ml-1">
                            · {new Date(r.admin_reply_at).toLocaleDateString(t("en-US", "bn-BD"))}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{r.admin_reply}</p>
                    </div>
                  )}

                  {replying === r.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder={t("Write a public reply…", "একটি পাবলিক উত্তর লিখুন…")}
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveReply(r.id)}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t("Save reply", "উত্তর সেভ")}
                        </button>
                        {r.admin_reply && (
                          <button
                            onClick={() => {
                              setReplyText("");
                              saveReply(r.id);
                            }}
                            className="inline-flex items-center h-9 px-3 rounded-full text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            {t("Remove reply", "উত্তর মুছুন")}
                          </button>
                        )}
                        <button
                          onClick={() => setReplying(null)}
                          className="inline-flex items-center h-9 px-3 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {t("Cancel", "বাতিল")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400">
                    {new Date(r.created_at).toLocaleDateString(t("en-US", "bn-BD"), {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                  {r.status !== "approved" && (
                    <button
                      onClick={() => updateStatus(r.id, "approved")}
                      title={t("Approve", "অনুমোদন")}
                      disabled={busy === r.id}
                      className="w-9 h-9 grid place-items-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(r.id, "rejected")}
                      title={t("Reject", "প্রত্যাখ্যান")}
                      disabled={busy === r.id}
                      className="w-9 h-9 grid place-items-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition disabled:opacity-60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(r.id, "pending")}
                      title={t("Move to pending", "অপেক্ষমাণ-এ সরান")}
                      disabled={busy === r.id}
                      className="w-9 h-9 grid place-items-center rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition disabled:opacity-60"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => startReply(r)}
                    title={t("Reply", "উত্তর দিন")}
                    className="w-9 h-9 grid place-items-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition"
                  >
                    <MessageSquareReply className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(r)}
                    title={t("Edit", "এডিট")}
                    className="w-9 h-9 grid place-items-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
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

function StatusBadge({ status, t }: { status: ReviewStatus; t: (en: string, bn: string) => string }) {
  const map: Record<ReviewStatus, { label: string; cls: string }> = {
    approved: {
      label: t("Approved", "অনুমোদিত"),
      cls: "bg-blue-50 text-blue-700 border-blue-100",
    },
    pending: {
      label: t("Pending", "অপেক্ষায়"),
      cls: "bg-amber-50 text-amber-700 border-amber-100",
    },
    rejected: {
      label: t("Rejected", "প্রত্যাখ্যাত"),
      cls: "bg-rose-50 text-rose-700 border-rose-100",
    },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
}
