import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/newsletter")({
  component: NewsletterPage,
  head: () => ({
    meta: [
      { title: "Newsletter — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string | null;
  source: string | null;
  tags: string[] | null;
  created_at: string;
};

type FilterKey = "all" | "active" | "unsubscribed";

function NewsletterPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Subscriber[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => (r.status ?? "active") === "active").length;
    const unsub = total - active;
    return { total, active, unsub };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const status = r.status ?? "active";
      if (filter === "active" && status !== "active") return false;
      if (filter === "unsubscribed" && status === "active") return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const exportCsv = () => {
    if (visible.length === 0) return toast.info(t("Nothing to export", "এক্সপোর্ট করার মতো কিছু নেই"));
    const header = ["email", "name", "status", "source", "created_at"];
    const lines = [header.join(",")];
    for (const r of visible) {
      const cells = [
        r.email,
        r.name ?? "",
        r.status ?? "active",
        r.source ?? "",
        r.created_at,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this subscriber?", "এই সাবস্ক্রাইবার মুছবেন?"))) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t("Newsletter Subscribers", "নিউজলেটার সাবস্ক্রাইবার")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("Email subscriber management", "ইমেইল সাবস্ক্রাইবার ম্যানেজমেন্ট")}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <Download className="w-4 h-4" />
          {t("CSV Export", "CSV এক্সপোর্ট")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4 text-violet-600" />}
          ring="ring-violet-200"
          value={counts.total}
          label={t("Total", "মোট")}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          ring="ring-emerald-200"
          value={counts.active}
          label={t("Active", "সক্রিয়")}
        />
        <StatCard
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          ring="ring-rose-200"
          value={counts.unsub}
          label={t("Unsubscribed", "আনসাবস্ক্রাইবড")}
        />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search email or name…", "ইমেইল বা নাম খুঁজুন…")}
            className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            {t("All", "সব")}
          </FilterPill>
          <FilterPill active={filter === "active"} onClick={() => setFilter("active")}>
            {t("Active", "সক্রিয়")}
          </FilterPill>
          <FilterPill
            active={filter === "unsubscribed"}
            onClick={() => setFilter("unsubscribed")}
          >
            {t("Unsubscribed", "আনসাবস্ক্রাইবড")}
          </FilterPill>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-sm text-slate-500 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          {t("Loading…", "লোড হচ্ছে…")}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center shadow-sm">
          <Mail className="w-7 h-7 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">{t("No subscribers", "কোনো সাবস্ক্রাইবার নেই")}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {visible.map((r) => {
              const active = (r.status ?? "active") === "active";
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50/70 transition"
                >
                  <span
                    className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${
                      active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {r.email}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {r.name ? `${r.name} · ` : ""}
                      {r.source ? `${r.source} · ` : ""}
                      {fmt(r.created_at)}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {active ? t("Active", "সক্রিয়") : t("Unsubscribed", "আনসাবস্ক্রাইবড")}
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    className="shrink-0 w-9 h-9 rounded-lg grid place-items-center text-rose-600 hover:bg-rose-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      <span className={`w-9 h-9 rounded-full bg-white grid place-items-center ring-1 ${ring}`}>
        {icon}
      </span>
      <div className="text-2xl font-extrabold text-slate-900 mt-2">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 px-5 rounded-full text-sm font-semibold border transition ${
        active
          ? "bg-white text-violet-700 border-violet-300 ring-1 ring-violet-200 shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
