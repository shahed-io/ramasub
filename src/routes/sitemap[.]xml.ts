import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://accessnowbd.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.7" },
  { path: "/streaming", changefreq: "weekly", priority: "0.8" },
  { path: "/ai-tools", changefreq: "weekly", priority: "0.8" },
  { path: "/education", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/sitemap", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "monthly", priority: "0.5" },
  { path: "/refund-policy", changefreq: "monthly", priority: "0.5" },
  { path: "/order-cancellation", changefreq: "monthly", priority: "0.4" },
  { path: "/delivery-info", changefreq: "monthly", priority: "0.5" },
  { path: "/refund-request", changefreq: "monthly", priority: "0.4" },
  { path: "/developer", changefreq: "monthly", priority: "0.4" },
  { path: "/blog/how-to-buy-netflix-in-bangladesh", changefreq: "monthly", priority: "0.7" },
  { path: "/login", changefreq: "monthly", priority: "0.3" },
];

async function fetchProductEntries(): Promise<SitemapEntry[]> {
  try {
    const env = typeof process !== "undefined" ? process.env : undefined;
    const url = env?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const key =
      env?.SUPABASE_PUBLISHABLE_KEY ||
      env?.SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data } = await client
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((p: { slug: string; updated_at?: string | null }) => ({
      path: `/product/${p.slug}`,
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly" as const,
      priority: "0.7",
    }));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const productEntries = await fetchProductEntries();
        const entries = [...STATIC_ENTRIES, ...productEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
