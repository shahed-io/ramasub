import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { Search, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

type HelpRow = {
  id: string;
  data: {
    title?: string;
    slug?: string;
    category?: string;
    excerpt?: string;
    cover_url?: string;
    tags?: string | string[];
    is_featured?: boolean;
  };
  created_at: string;
  updated_at: string;
};

const CATEGORIES: Array<{ id: string; label: string; emoji: string }> = [
  { id: "orders", label: "Orders & Delivery", emoji: "📦" },
  { id: "payment", label: "Payment", emoji: "💳" },
  { id: "account", label: "Account & Login", emoji: "🔐" },
  { id: "warranty", label: "Warranty & Refund", emoji: "🛡️" },
  { id: "subscription", label: "Subscription Usage", emoji: "▶️" },
  { id: "technical", label: "Troubleshooting", emoji: "🛠️" },
  { id: "general", label: "General", emoji: "💬" },
];

const listArticles = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient(
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await sb
    .from("admin_records")
    .select("id,data,created_at,updated_at")
    .eq("kind", "help_article")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as HelpRow[];
});

const TITLE = "Help Center — Rama Sub | Netflix, ChatGPT, Adobe সাহায্য";
const DESC = "Rama Sub-এর Help Center: order, payment (bKash/Nagad), warranty, subscription setup সহ সব প্রশ্নের উত্তর এক জায়গায়।";
const URL_C = `${SITE_URL}/help`;

export const Route = createFileRoute("/help/")({
  loader: async () => ({ articles: await listArticles() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_C },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL_C }],
  }),
  component: HelpIndexPage,
});

function HelpIndexPage() {
  const { articles } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return articles.filter((a: HelpRow) => {
      const d = a.data || {};
      if (cat && d.category !== cat) return false;
      if (!query) return true;
      const hay = [d.title, d.excerpt, Array.isArray(d.tags) ? d.tags.join(" ") : d.tags]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(query);
    });
  }, [articles, q, cat]);

  const featured = articles.filter((a: HelpRow) => a.data?.is_featured).slice(0, 3);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) {
      const c = a.data?.category || "general";
      m[c] = (m[c] || 0) + 1;
    }
    return m;
  }, [articles]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-fuchsia-600 to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" /> HELP CENTER
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
            আপনার সব প্রশ্নের উত্তর
          </h1>
          <p className="mt-3 text-white/85 max-w-2xl mx-auto">
            Order, payment, warranty, setup — Rama Sub-এর সব guide এক জায়গায়। খুঁজুন অথবা category বেছে নিন।
          </p>

          <div className="mt-7 max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="যেমন: bKash payment fail, Netflix login..."
              className="w-full h-14 pl-12 pr-4 rounded-full text-slate-900 bg-white shadow-xl focus:outline-none focus:ring-4 focus:ring-white/40"
            />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setCat(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${cat === null ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"}`}
          >
            All ({articles.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id === cat ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${cat === c.id ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"}`}
            >
              {c.emoji} {c.label} {counts[c.id] ? `(${counts[c.id]})` : ""}
            </button>
          ))}
        </div>

        {/* Featured */}
        {!q && !cat && featured.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Featured</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((a: HelpRow) => <ArticleCard key={a.id} article={a} featured />)}
            </div>
          </div>
        )}

        {/* All / filtered */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            {q ? `Search: "${q}" — ${filtered.length} results` : cat ? `${CATEGORIES.find(c => c.id === cat)?.label} (${filtered.length})` : `All articles (${filtered.length})`}
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500">কোনো article পাওয়া যায়নি।</p>
              <a href="https://wa.me/8801601048085"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-[#25D366] text-white text-sm font-bold">
                <MessageCircle className="w-4 h-4" /> WhatsApp-এ জিজ্ঞাসা করুন
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a: HelpRow) => <ArticleCard key={a.id} article={a} />)}
            </div>
          )}
        </div>

        {/* Contact box */}
        <div className="mt-14 rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 text-white p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-black">এখনও উত্তর পাননি?</h3>
              <p className="mt-2 text-white/80">আমাদের support team প্রতিদিন 11 AM – 11 PM অবধি available।</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="https://wa.me/8801601048085"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#25D366] text-white text-sm font-bold shadow-lg">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
              <Link to="/contact"
                className="inline-flex items-center h-11 px-5 rounded-full bg-white text-slate-900 text-sm font-bold">
                Contact page
              </Link>
              <Link to="/faq"
                className="inline-flex items-center h-11 px-5 rounded-full bg-white/10 border border-white/25 text-white text-sm font-bold">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ArticleCard({ article, featured }: { article: HelpRow; featured?: boolean }) {
  const d = article.data || {};
  const slug = d.slug || "";
  const cat = CATEGORIES.find((c) => c.id === d.category);
  return (
    <Link
      to="/help/$slug"
      params={{ slug }}
      className={`group block rounded-2xl bg-white border p-5 transition hover:-translate-y-0.5 hover:shadow-xl ${featured ? "border-amber-200 shadow-md" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 mb-2">
        <span>{cat?.emoji || "📄"}</span>
        <span className="uppercase tracking-wide">{cat?.label || "General"}</span>
      </div>
      <h3 className="font-bold text-slate-900 leading-snug group-hover:text-violet-700 line-clamp-2">
        {d.title || "Untitled"}
      </h3>
      {d.excerpt && (
        <p className="mt-2 text-sm text-slate-600 line-clamp-3">{d.excerpt}</p>
      )}
      <div className="mt-3 text-xs font-semibold text-violet-600 group-hover:underline">
        পড়ুন →
      </div>
    </Link>
  );
}
