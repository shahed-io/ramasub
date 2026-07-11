import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

type HelpData = {
  title?: string;
  slug?: string;
  category?: string;
  excerpt?: string;
  body?: string;
  cover_url?: string;
  video_url?: string;
  tags?: string | string[];
  related_product_slug?: string;
  seo_title?: string;
  seo_description?: string;
};

const getArticle = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = createClient(
      process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows } = await sb
      .from("admin_records")
      .select("id,data,created_at,updated_at")
      .eq("kind", "help_article")
      .eq("is_active", true)
      .filter("data->>slug", "eq", data.slug)
      .limit(1);
    const row = rows?.[0];
    if (!row) return null;

    // related articles (same category, exclude self)
    const cat = (row.data as HelpData)?.category;
    let related: Array<{ id: string; data: HelpData }> = [];
    if (cat) {
      const { data: rel } = await sb
        .from("admin_records")
        .select("id,data")
        .eq("kind", "help_article")
        .eq("is_active", true)
        .filter("data->>category", "eq", cat)
        .limit(6);
      related = ((rel ?? []) as Array<{ id: string; data: HelpData }>).filter((r) => r.id !== row.id).slice(0, 4);
    }
    return { row, related } as {
      row: { id: string; data: HelpData; created_at: string; updated_at: string };
      related: Array<{ id: string; data: HelpData }>;
    };
  });

export const Route = createFileRoute("/help/$slug")({
  loader: async ({ params }) => {
    const res = await getArticle({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const r = loaderData?.row;
    if (!r) return {};
    const d = r.data;
    const url = `${SITE_URL}/help/${d.slug}`;
    const title = d.seo_title || d.title || "Help — Rama Sub";
    const desc = d.seo_description || d.excerpt || "";
    const image = d.cover_url || "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: d.title,
            description: desc,
            image: image || undefined,
            datePublished: r.created_at,
            dateModified: r.updated_at || r.created_at,
            author: { "@type": "Organization", name: "Rama Sub" },
            publisher: { "@type": "Organization", name: "Rama Sub", url: SITE_URL },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  component: HelpArticlePage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Article not found</h1>
        <p className="mt-3 text-slate-600">এই article-টি খুঁজে পাওয়া যায়নি।</p>
        <Link to="/help" className="inline-block mt-6 px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold">
          ← Help Center-এ ফিরে যান
        </Link>
      </main>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-slate-600">{error?.message || "Please try again."}</p>
      </main>
      <SiteFooter />
    </div>
  ),
});

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function HelpArticlePage() {
  const { row, related } = Route.useLoaderData();
  const d = row.data;
  const embed = d.video_url ? youtubeEmbed(d.video_url) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-xs text-slate-500 mb-4">
          <Link to="/" className="hover:text-slate-700">Home</Link>
          {" / "}
          <Link to="/help" className="hover:text-slate-700">Help</Link>
          {" / "}
          <span className="text-slate-700">{d.title}</span>
        </nav>

        <Link to="/help" className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> সব article
        </Link>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
          {d.title}
        </h1>

        {d.excerpt && (
          <p className="mt-4 text-lg text-slate-700 border-l-4 border-violet-500 pl-4">
            {d.excerpt}
          </p>
        )}

        {d.cover_url && (
          <img src={d.cover_url} alt={d.title || ""} className="w-full mt-6 rounded-2xl object-cover max-h-[420px]" />
        )}

        {embed && (
          <div className="mt-6 rounded-2xl overflow-hidden aspect-video bg-black">
            <iframe src={embed} title={d.title || "Video"} className="w-full h-full" allowFullScreen />
          </div>
        )}

        <article
          className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 md:p-8 prose prose-slate max-w-none prose-headings:font-bold prose-a:text-violet-700 prose-h2:mt-8 prose-h2:text-2xl prose-h3:text-lg"
          dangerouslySetInnerHTML={{ __html: d.body || "" }}
        />

        {d.related_product_slug && (
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 text-center">
            <p className="text-sm text-slate-600 mb-3">এই guide-টি এই product-এর জন্য</p>
            <Link
              to="/product/$slug"
              params={{ slug: d.related_product_slug }}
              className="inline-block px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow"
            >
              Product দেখুন →
            </Link>
          </div>
        )}

        {/* Contact fallback */}
        <div className="mt-10 rounded-2xl bg-white border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">এই উত্তর যথেষ্ট ছিল না?</h3>
            <p className="text-sm text-slate-600 mt-1">WhatsApp-এ মেসেজ দিলে সাথে সাথে reply পাবেন।</p>
          </div>
          <a href="https://wa.me/8801601048085"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#25D366] text-white text-sm font-bold shadow">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Related articles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r: { id: string; data: HelpData }) => (
                <Link
                  key={r.id}
                  to="/help/$slug"
                  params={{ slug: r.data.slug || "" }}
                  className="block p-4 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow transition"
                >
                  <div className="font-semibold text-slate-900">{r.data.title}</div>
                  {r.data.excerpt && (
                    <div className="mt-1 text-xs text-slate-600 line-clamp-2">{r.data.excerpt}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
