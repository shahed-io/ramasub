import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://ramasub.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/streaming", changefreq: "weekly", priority: "0.8" },
  { path: "/ai-tools", changefreq: "weekly", priority: "0.8" },
  { path: "/education", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/delivery-info", changefreq: "monthly", priority: "0.5" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/order-cancellation", changefreq: "yearly", priority: "0.4" },
  { path: "/blog/how-to-buy-netflix-in-bangladesh", changefreq: "monthly", priority: "0.6" },
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_ENTRIES];

        try {
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data: products } = await sb
            .from("products")
            .select("slug, updated_at")
            .eq("is_active", true);
          if (products) {
            for (const p of products) {
              if (!p.slug) continue;
              entries.push({
                path: `/product/${p.slug}`,
                lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
                changefreq: "weekly",
                priority: "0.7",
              });
            }
          }

          const { data: cats } = await sb
            .from("admin_records")
            .select("data, updated_at")
            .eq("kind", "category")
            .eq("is_active", true);
          if (cats) {
            for (const c of cats) {
              const slug = (c.data as { slug?: string } | null)?.slug;
              if (!slug) continue;
              entries.push({
                path: `/categories/${slug}`,
                lastmod: c.updated_at ? new Date(c.updated_at).toISOString().slice(0, 10) : undefined,
                changefreq: "weekly",
                priority: "0.6",
              });
            }
          }
        } catch (e) {
          console.error("[sitemap] dynamic fetch failed", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${esc(BASE_URL + e.path)}</loc>`,
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
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
