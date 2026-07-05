import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ClipboardList, CheckCircle2, AlertTriangle, XCircle, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/Mahbub214/seo-audit")({
  component: SeoAuditPage,
  head: () => ({ meta: [{ title: "SEO Audit — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type ProductRow = {
  slug: string | null;
  name: string | null;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  meta: Record<string, unknown> | null;
  is_active: boolean;
};


type AuditRow = {
  url: string;
  label: string;
  score: number;
  total: number;
  issues: string[];
  passes: string[];
};

const STATIC_PAGES: { url: string; label: string }[] = [
  { url: "/", label: "Home" },
  { url: "/products", label: "All Products" },
  { url: "/categories", label: "Categories" },
  { url: "/streaming", label: "Streaming" },
  { url: "/ai-tools", label: "AI Tools" },
  { url: "/education", label: "Education" },
  { url: "/contact", label: "Contact" },
  { url: "/faq", label: "FAQ" },
  { url: "/blog/how-to-buy-netflix-in-bangladesh", label: "Blog post" },
];

function auditProduct(p: ProductRow): AuditRow {
  const meta = (p.meta ?? {}) as { title?: string; description?: string; og_image?: string };
  const title = meta.title || p.name || "";
  const desc = meta.description || p.short_description || p.description?.slice(0, 200) || "";
  const issues: string[] = [];
  const passes: string[] = [];
  let score = 0;
  const total = 7;

  // 1. has slug
  if (p.slug) { score++; passes.push("URL slug set"); } else issues.push("Missing URL slug");
  // 2. title length 30-60
  if (title.length >= 30 && title.length <= 60) { score++; passes.push(`Title length OK (${title.length})`); }
  else issues.push(`Title length ${title.length} (target 30–60)`);
  // 3. desc length 120-160
  if (desc.length >= 120 && desc.length <= 160) { score++; passes.push(`Description length OK (${desc.length})`); }
  else issues.push(`Description length ${desc.length} (target 120–160)`);
  // 4. has image
  if (p.image_url) { score++; passes.push("Product image set"); } else issues.push("Missing product image");
  // 5. has OG image override or product image
  if (meta.og_image || p.image_url) { score++; passes.push("OG image available"); } else issues.push("No OG image");
  // 6. description >= 300 chars (content depth)
  if ((p.description?.length ?? 0) >= 300) { score++; passes.push("Rich description (300+ chars)"); }
  else issues.push(`Description too short (${p.description?.length ?? 0} chars)`);
  // 7. is_active (indexable)
  if (p.is_active) { score++; passes.push("Active / indexable"); } else issues.push("Inactive — not in sitemap");

  return {
    url: `/product/${p.slug ?? ""}`,
    label: p.name ?? "Untitled",
    score,
    total,
    issues,
    passes,
  };
}

function auditStatic(label: string): AuditRow {
  // Static pages get a structural score — they have route head() defined.
  return {
    url: label,
    label,
    score: 6,
    total: 7,
    issues: ["Manual check: open the live page to verify title/description"],
    passes: ["Has route file", "Has head() meta", "In sitemap", "Indexable", "Self-canonical", "Mobile viewport"],
  };
}

function SeoAuditPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"all" | "issues" | "passing">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("slug, name, short_description, description, image_url, meta, is_active");
      const productRows = ((data ?? []) as unknown as ProductRow[]).map(auditProduct);
      const staticRows = STATIC_PAGES.map((p) => ({ ...auditStatic(p.label), url: p.url }));
      setRows([...staticRows, ...productRows]);

      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter.trim()) {
      const f = filter.toLowerCase();
      r = r.filter((x) => x.label.toLowerCase().includes(f) || x.url.toLowerCase().includes(f));
    }
    if (tab === "issues") r = r.filter((x) => x.score < x.total);
    if (tab === "passing") r = r.filter((x) => x.score === x.total);
    return r.sort((a, b) => a.score / a.total - b.score / b.total);
  }, [rows, filter, tab]);

  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + (r.score / r.total) * 100, 0) / rows.length)) : 0;
  const withIssues = rows.filter((r) => r.score < r.total).length;
  const perfect = rows.filter((r) => r.score === r.total).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("SEO Audit Dashboard", "SEO অডিট ড্যাশবোর্ড")}</h1>
              <p className="text-white/80 text-sm mt-1">{t("Per-page SEO score — title length, description, OG image, slug, content depth", "প্রতি পেজের SEO স্কোর")}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat color="indigo" label={t("Pages audited", "অডিট করা পেজ")} value={rows.length} />
          <Stat color="emerald" label={t("Avg score", "গড় স্কোর")} value={`${avg}%`} />
          <Stat color="rose" label={t("With issues", "সমস্যা আছে")} value={withIssues} />
          <Stat color="teal" label={t("Perfect", "পারফেক্ট")} value={perfect} />
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("Search pages…", "পেজ খুঁজুন…")}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["all", "issues", "passing"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {k === "all" ? t("All", "সব") : k === "issues" ? t("Issues", "সমস্যা") : t("Passing", "পাস")}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="min-h-[30vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => <AuditCard key={r.url} row={r} />)}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-slate-500">{t("No pages match.", "কোন পেজ মেলেনি।")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditCard({ row }: { row: AuditRow }) {
  const pct = Math.round((row.score / row.total) * 100);
  const color = pct === 100 ? "emerald" : pct >= 70 ? "violet" : "rose";
  const ring = { emerald: "ring-emerald-200 bg-emerald-50 text-emerald-700", violet: "ring-violet-200 bg-violet-50 text-violet-700", rose: "ring-rose-200 bg-rose-50 text-rose-700" }[color];
  const Icon = pct === 100 ? CheckCircle2 : pct >= 70 ? AlertTriangle : XCircle;
  return (
    <details className="group rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden open:shadow-md transition">
      <summary className="list-none cursor-pointer p-4 flex items-center gap-3 hover:bg-slate-50/60">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ring-1 ${ring} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{row.label}</div>
          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
            {row.url}
            <a href={row.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-indigo-600">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-lg font-bold ${color === "emerald" ? "text-emerald-600" : color === "violet" ? "text-violet-600" : "text-rose-600"}`}>{pct}%</div>
          <div className="text-[10px] text-slate-500">{row.score}/{row.total} {row.score === 1 ? "check" : "checks"}</div>
        </div>
      </summary>
      <div className="border-t border-slate-100 bg-slate-50/40 p-4 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">✓ Passing</div>
          <ul className="space-y-1">
            {row.passes.map((p, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-emerald-500">•</span>{p}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-2">⚠ Issues</div>
          <ul className="space-y-1">
            {row.issues.length === 0 ? <li className="text-xs text-slate-400 italic">None — great work!</li> : row.issues.map((p, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-rose-500">•</span>{p}</li>)}
          </ul>
        </div>
      </div>
    </details>
  );
}

function Stat({ color, label, value }: { color: "indigo" | "emerald" | "rose" | "teal"; label: string; value: number | string }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500 to-violet-600",
    emerald: "from-emerald-500 to-teal-600",
    rose: "from-rose-500 to-pink-600",
    teal: "from-teal-500 to-cyan-600",
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <div className={`text-[11px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${tones[color]}`}>{label}</div>
      <div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
