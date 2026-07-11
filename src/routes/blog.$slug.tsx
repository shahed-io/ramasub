import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

type BlogData = {
  title?: string;
  slug?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  cover_url?: string;
  body?: string;
  author?: string;
  product_slug?: string;
  tags?: string[];
  faq?: Array<{ q: string; a: string }>;
  published_at?: string;
};

const getBlog = createServerFn({ method: "GET" })
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
      .eq("kind", "blog_post")
      .eq("is_active", true)
      .filter("data->>slug", "eq", data.slug)
      .limit(1);
    const row = rows?.[0];
    if (!row) return null;
    return row as { id: string; data: BlogData; created_at: string; updated_at: string };
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlog({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return {};
    const d = p.data;
    const url = `${SITE_URL}/blog/${d.slug}`;
    const title = d.meta_title || d.title || "Rama Sub Blog";
    const desc = d.meta_description || d.excerpt || "";
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
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: d.title,
            description: desc,
            image: image || undefined,
            datePublished: d.published_at || p.created_at,
            dateModified: p.updated_at || p.created_at,
            author: { "@type": "Organization", name: d.author || "Rama Sub" },
            publisher: {
              "@type": "Organization",
              name: "Rama Sub",
              url: SITE_URL,
            },
            mainEntityOfPage: url,
          }),
        },
        ...(Array.isArray(d.faq) && d.faq.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: d.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },
  component: BlogPostPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Post not found</h1>
        <p className="mt-3 text-slate-600">This article does not exist or has been unpublished.</p>
        <Link to="/blog" className="inline-block mt-6 px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold">
          Back to blog
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

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const d = post.data;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-xs text-slate-500 mb-4">
          <Link to="/" className="hover:text-slate-700">Home</Link>
          {" / "}
          <Link to="/blog" className="hover:text-slate-700">Blog</Link>
        </nav>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
          {d.title}
        </h1>

        <div className="mt-4 text-sm text-slate-500 flex flex-wrap items-center gap-3">
          <span>By {d.author || "Rama Sub Team"}</span>
          <span>·</span>
          <span>{new Date(d.published_at || post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          {Array.isArray(d.tags) && d.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-1.5">
                {d.tags.slice(0, 5).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">{t}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {d.cover_url && (
          <img
            src={d.cover_url}
            alt={d.title || ""}
            className="w-full mt-6 rounded-2xl object-cover max-h-[420px]"
          />
        )}

        {d.excerpt && (
          <p className="mt-6 text-lg text-slate-700 border-l-4 border-violet-500 pl-4 italic">
            {d.excerpt}
          </p>
        )}

        <article
          className="mt-8 prose prose-slate max-w-none prose-headings:font-bold prose-a:text-violet-700 prose-h2:mt-8 prose-h2:text-2xl prose-h3:text-lg prose-table:text-sm prose-td:px-3 prose-td:py-2 prose-th:px-3 prose-th:py-2 prose-th:bg-slate-50"
          dangerouslySetInnerHTML={{ __html: d.body || "" }}
        />

        {d.product_slug && (
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 text-center">
            <p className="text-sm text-slate-600 mb-3">Ready to buy?</p>
            <Link
              to="/product/$slug"
              params={{ slug: d.product_slug }}
              className="inline-block px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow"
            >
              View pricing & order via bKash / Nagad →
            </Link>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link to="/blog" className="text-sm text-violet-700 hover:underline">← All articles</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
