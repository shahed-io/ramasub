import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

type BlogRow = {
  id: string;
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    cover_url?: string;
    author?: string;
    published_at?: string;
    tags?: string[];
  };
  created_at: string;
};

const listBlogs = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient(
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await sb
    .from("admin_records")
    .select("id,data,created_at")
    .eq("kind", "blog_post")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as BlogRow[];
});

const TITLE = "Blog — Digital Subscription Guides Bangladesh | Rama Sub";
const DESCRIPTION =
  "Netflix, ChatGPT, Adobe, Microsoft 365, Zoom সহ সব digital subscription Bangladesh থেকে bKash/Nagad দিয়ে কেনার guide, price, review — এক জায়গায়।";
const URL_C = `${SITE_URL}/blog`;

export const Route = createFileRoute("/blog/")({
  loader: async () => ({ posts: await listBlogs() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_C },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL_C }],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { posts } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900">Rama Sub Blog</h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Digital subscription guides, price updates, and how-to articles for Bangladesh.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No posts yet. Please check back soon.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p: BlogRow) => {
              const d = p.data || {};
              const slug = d.slug || "";
              return (
                <Link
                  key={p.id}
                  to="/blog/$slug"
                  params={{ slug }}
                  className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-violet-300 transition"
                >
                  {d.cover_url ? (
                    <img
                      src={d.cover_url}
                      alt={d.title || ""}
                      className="w-full h-44 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-violet-100 via-fuchsia-100 to-sky-100 grid place-items-center text-4xl">
                      📘
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="font-bold text-slate-900 group-hover:text-violet-700 line-clamp-2">
                      {d.title || "Untitled"}
                    </h2>
                    {d.excerpt && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{d.excerpt}</p>
                    )}
                    <div className="mt-3 text-xs text-slate-500">
                      {d.author || "Rama Sub Team"} ·{" "}
                      {new Date(d.published_at || p.created_at).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
