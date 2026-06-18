import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Link as LinkIcon, Plus, Sparkles, Copy, ExternalLink, Pause, Play,
  Pencil, Trash2, X, Save, Loader2, Inbox, Search as SearchIcon,
  CheckCircle2, Clock, User, Phone, Mail, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/payment-links")({
  component: PaymentLinksPage,
});

type LinkData = {
  title?: string;
  slug?: string;
  amount?: number;
  currency?: string;
  description?: string;
  redirect_url?: string;
  expires_at?: string;
  single_use?: boolean;
  uses?: number;
};
type LinkRow = {
  id: string;
  kind: string;
  data: LinkData;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type Submission = {
  id: string;
  data: {
    link_slug?: string;
    link_title?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    amount?: number;
    txn_id?: string;
    payment_method?: string;
    status?: "pending" | "verified" | "rejected";
    note?: string;
  };
  is_active: boolean;
  created_at: string;
};

const fmt = (n: number | undefined) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");

const randomSlug = () => {
  const a = Math.random().toString(36).slice(2, 9);
  const b = Math.random().toString(36).slice(2, 7).toUpperCase();
  return { slug: `pay-mpz${a}-${b.toLowerCase()}`, suffix: b };
};

function PaymentLinksPage() {
  const { t } = useAdminLang();
  const [tab, setTab] = useState<"links" | "submissions">("links");
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: linkData }, { data: subData }] = await Promise.all([
      supabase.from("admin_records").select("*").eq("kind", "payment_link").order("created_at", { ascending: false }),
      supabase.from("admin_records").select("*").eq("kind", "payment_link_submission").order("created_at", { ascending: false }),
    ]);
    setRows(((linkData ?? []) as unknown) as LinkRow[]);
    setSubs(((subData ?? []) as unknown) as Submission[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const quickGenerate = async () => {
    const { slug, suffix } = randomSlug();
    const payload = {
      kind: "payment_link",
      is_active: true,
      data: {
        title: `Quick Payment Link ${suffix}`,
        slug,
        amount: 0,
        currency: "BDT",
        uses: 0,
      } as never,
    };
    const { error } = await supabase.from("admin_records").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t("Quick payment link created", "কুইক পেমেন্ট লিঙ্ক তৈরি হয়েছে"));
    load();
  };

  const toggleActive = async (row: LinkRow) => {
    const { error } = await supabase.from("admin_records").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this payment link?", "এই পেমেন্ট লিঙ্ক ডিলিট করবেন?"))) return;
    const { error } = await supabase.from("admin_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    load();
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("Link copied", "লিঙ্ক কপি হয়েছে")),
      () => toast.error(t("Copy failed", "কপি ব্যর্থ")),
    );
  };

  const openLink = (slug: string) => {
    window.open(`${window.location.origin}/pay/${slug}`, "_blank", "noopener");
  };

  const visibleRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      String(r.data?.title ?? "").toLowerCase().includes(s) ||
      String(r.data?.slug ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const visibleSubs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return subs;
    return subs.filter((r) =>
      String(r.data?.full_name ?? "").toLowerCase().includes(s) ||
      String(r.data?.phone ?? "").toLowerCase().includes(s) ||
      String(r.data?.link_slug ?? "").toLowerCase().includes(s),
    );
  }, [subs, q]);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-11 h-11 rounded-xl bg-violet-50 ring-1 ring-violet-100 text-violet-600 grid place-items-center">
              <LinkIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {t("Payment Links", "পেমেন্ট লিঙ্ক")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {t("Create shareable payment links and review customer submissions.", "শেয়ারযোগ্য পেমেন্ট লিঙ্ক তৈরি ও কাস্টমার সাবমিশন রিভিউ করুন।")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={quickGenerate}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              {t("Quick Generate Link", "কুইক জেনারেট লিঙ্ক")}
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-bold transition"
            >
              <Plus className="w-4 h-4" />
              {t("Custom Link", "কাস্টম লিঙ্ক")}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setTab("links")}
            className={`px-4 h-9 rounded-lg text-sm font-bold transition ${
              tab === "links" ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Links", "লিঙ্ক")} ({rows.length})
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={`px-4 h-9 rounded-lg text-sm font-bold transition ${
              tab === "submissions" ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Submissions", "সাবমিশন")} ({subs.length})
          </button>
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "links"
              ? t("Search by title or slug…", "টাইটেল বা স্লাগ দিয়ে খুঁজুন…")
              : t("Search by name, phone or slug…", "নাম, ফোন বা স্লাগ দিয়ে খুঁজুন…")}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : tab === "links" ? (
        <LinksTable
          rows={visibleRows}
          onCopy={copyLink}
          onOpen={openLink}
          onToggle={toggleActive}
          onEdit={(r) => { setEditing(r); setShowForm(true); }}
          onDelete={remove}
        />
      ) : (
        <SubmissionsTable rows={visibleSubs} />
      )}

      {showForm && (
        <LinkForm
          record={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

/* =========================== Links table =========================== */

function LinksTable({
  rows, onCopy, onOpen, onToggle, onEdit, onDelete,
}: {
  rows: LinkRow[];
  onCopy: (slug: string) => void;
  onOpen: (slug: string) => void;
  onToggle: (row: LinkRow) => void;
  onEdit: (row: LinkRow) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useAdminLang();

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-violet-50 grid place-items-center text-violet-600 mb-3">
          <LinkIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{t("No payment links yet", "এখনো কোনো পেমেন্ট লিঙ্ক নেই")}</h3>
        <p className="text-sm text-slate-500 mt-1">{t('Click "Quick Generate Link" to create your first link.', '"কুইক জেনারেট লিঙ্ক" ক্লিক করে শুরু করুন।')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
            <tr>
              <th className="text-left px-5 py-3">{t("Title", "টাইটেল")}</th>
              <th className="text-left px-5 py-3">{t("Slug", "স্লাগ")}</th>
              <th className="text-left px-5 py-3">{t("Amount", "অ্যামাউন্ট")}</th>
              <th className="text-left px-5 py-3">{t("Uses", "ইউজ")}</th>
              <th className="text-left px-5 py-3">{t("Status", "স্ট্যাটাস")}</th>
              <th className="text-right px-5 py-3">{t("Actions", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const slug = String(r.data?.slug ?? "");
              const uses = Number(r.data?.uses ?? 0);
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {String(r.data?.title ?? "—")}
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-[12px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {slug || "—"}
                    </code>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{fmt(r.data?.amount)}</td>
                  <td className="px-5 py-4 text-slate-700">{uses}</td>
                  <td className="px-5 py-4">
                    {r.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-600 text-white">
                        {t("active", "সক্রিয়")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                        {t("paused", "পজড")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionBtn tone="sky" title={t("Copy link", "লিঙ্ক কপি")} onClick={() => onCopy(slug)}>
                        <Copy className="w-4 h-4" />
                      </ActionBtn>
                      <ActionBtn tone="indigo" title={t("Open", "ওপেন")} onClick={() => onOpen(slug)}>
                        <ExternalLink className="w-4 h-4" />
                      </ActionBtn>
                      <ActionBtn
                        tone={r.is_active ? "amber" : "emerald"}
                        title={r.is_active ? t("Pause", "পজ") : t("Activate", "সক্রিয়")}
                        onClick={() => onToggle(r)}
                      >
                        {r.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </ActionBtn>
                      <ActionBtn tone="violet" title={t("Edit", "এডিট")} onClick={() => onEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </ActionBtn>
                      <ActionBtn tone="rose" title={t("Delete", "ডিলিট")} onClick={() => onDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  sky: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200",
};

function ActionBtn({
  tone, title, onClick, children,
}: { tone: keyof typeof TONE; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-9 h-9 grid place-items-center rounded-lg border transition ${TONE[tone]}`}
    >
      {children}
    </button>
  );
}

/* =========================== Submissions table =========================== */

function SubmissionsTable({ rows }: { rows: Submission[] }) {
  const { t } = useAdminLang();

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-sky-50 grid place-items-center text-sky-600 mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{t("No submissions yet", "এখনো কোনো সাবমিশন নেই")}</h3>
        <p className="text-sm text-slate-500 mt-1">
          {t("Customer payments through your links will appear here.", "আপনার লিঙ্ক দিয়ে আসা কাস্টমার পেমেন্ট এখানে দেখাবে।")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
            <tr>
              <th className="text-left px-5 py-3">{t("Customer", "কাস্টমার")}</th>
              <th className="text-left px-5 py-3">{t("Link", "লিঙ্ক")}</th>
              <th className="text-left px-5 py-3">{t("Amount", "অ্যামাউন্ট")}</th>
              <th className="text-left px-5 py-3">{t("Payment", "পেমেন্ট")}</th>
              <th className="text-left px-5 py-3">{t("Status", "স্ট্যাটাস")}</th>
              <th className="text-left px-5 py-3">{t("Submitted", "সাবমিট")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const d = r.data ?? {};
              const status = d.status ?? "pending";
              const statusStyles =
                status === "verified" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : status === "rejected" ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-amber-100 text-amber-700 border-amber-200";
              return (
                <tr key={r.id} className="hover:bg-slate-50/60 align-top">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {d.full_name ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      {d.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</span>}
                      {d.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{d.email}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">{d.link_title ?? "—"}</div>
                    {d.link_slug && (
                      <code className="text-[11px] font-mono text-slate-500">{d.link_slug}</code>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{fmt(d.amount)}</td>
                  <td className="px-5 py-4 text-slate-700">
                    <div className="capitalize font-medium">{d.payment_method ?? "—"}</div>
                    {d.txn_id && <div className="text-xs text-slate-500 font-mono">{d.txn_id}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusStyles}`}>
                      {status === "verified" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================== Form modal =========================== */

function LinkForm({
  record, onClose, onSaved,
}: {
  record: LinkRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useAdminLang();
  const init: LinkData = record?.data ?? { currency: "BDT" };
  const [data, setData] = useState<LinkData>(init);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LinkData>(k: K, v: LinkData[K]) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!data.title || !String(data.title).trim()) return toast.error(t("Title is required", "টাইটেল দিতে হবে"));
    if (!data.amount || Number(data.amount) <= 0) return toast.error(t("Enter a valid amount", "সঠিক অ্যামাউন্ট দিন"));
    setSaving(true);
    const slug = data.slug && data.slug.trim()
      ? data.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-")
      : `pay-${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      kind: "payment_link",
      is_active: record?.is_active ?? true,
      data: { ...data, slug, uses: data.uses ?? 0 } as never,
    };
    const op = record
      ? supabase.from("admin_records").update(payload).eq("id", record.id)
      : supabase.from("admin_records").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(record ? t("Updated", "আপডেট হয়েছে") : t("Created", "তৈরি হয়েছে"));
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {record ? t("Edit payment link", "পেমেন্ট লিঙ্ক এডিট") : t("New payment link", "নতুন পেমেন্ট লিঙ্ক")}
          </h2>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <Field label={t("Title / what is it for", "টাইটেল")} required>
            <input
              value={data.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
              placeholder={t("e.g. Netflix Premium 1 month", "যেমন: Netflix Premium ১ মাস")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Slug (auto)", "স্লাগ (অটো)")}>
              <input
                value={data.slug ?? ""}
                onChange={(e) => set("slug", e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                placeholder="pay-xxxxxxx"
              />
            </Field>
            <Field label={t("Amount (৳)", "অ্যামাউন্ট (৳)")} required>
              <input
                type="number"
                value={data.amount ?? ""}
                onChange={(e) => set("amount", Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                placeholder="0"
              />
            </Field>
          </div>
          <Field label={t("Description", "ডেসক্রিপশন")}>
            <textarea
              value={data.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
            />
          </Field>
          <Field label={t("Success redirect URL", "সাকসেস রিডাইরেক্ট URL")}>
            <input
              type="url"
              value={data.redirect_url ?? ""}
              onChange={(e) => set("redirect_url", e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
              placeholder="https://…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Expires at", "মেয়াদ শেষ")}>
              <input
                type="date"
                value={data.expires_at ?? ""}
                onChange={(e) => set("expires_at", e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
              />
            </Field>
            <Field label={t("Single use", "একবার ব্যবহার")}>
              <label className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-slate-200 bg-white">
                <input
                  type="checkbox"
                  checked={!!data.single_use}
                  onChange={(e) => set("single_use", e.target.checked)}
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-sm text-slate-700">{t("One-time link", "একবার ব্যবহারযোগ্য")}</span>
              </label>
            </Field>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {t("Cancel", "বাতিল")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold shadow inline-flex items-center gap-1.5 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("Save", "সংরক্ষণ")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
