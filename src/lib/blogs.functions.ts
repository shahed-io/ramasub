import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(sb: any, userId: string) {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin role required");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function callAI(system: string, user: string): Promise<any> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — try again shortly");
    if (res.status === 402) throw new Error("Lovable AI credits exhausted");
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

const BLOG_SYSTEM = `You are an SEO copywriter for Rama Sub (ramasub.com), Bangladesh's trusted digital subscription store selling Netflix, ChatGPT Plus, Adobe, Microsoft 365, Google, Zoom, Coursera and similar products with bKash/Nagad payment.

Write a long, helpful, uniquely-worded blog post (900-1400 words) in mixed Bangla + English (Banglish where natural — Bengali readers first). Focus on genuine buyer intent: pricing in BDT, plans, how to pay via bKash/Nagad, delivery time, warranty, common questions.

Return ONLY valid JSON in this exact shape:
{
  "title": "SEO-optimized H1 (55-65 chars, include 'Bangladesh' or 'BD')",
  "slug": "kebab-case-slug",
  "excerpt": "1-2 sentence summary (140-160 chars)",
  "meta_title": "<=60 char meta title",
  "meta_description": "<=155 char meta description",
  "body": "Full HTML article using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>. No <html>/<head>/<body>. Include: intro, feature list, plan/price table (BDT), how to order via bKash/Nagad on ramasub.com, delivery/warranty, FAQ (5 Q&A using <h3>+<p>), closing CTA. Use inline anchor links to /product/{slug} and /contact where relevant.",
  "faq": [{"q":"...","a":"..."}, ...5 items],
  "tags": ["tag1","tag2","tag3"]
}`;

function buildProductPrompt(p: any) {
  return `Write a blog post for this product on ramasub.com:

Product name: ${p.name}
Slug: ${p.slug}
Category: ${p.category || "Subscription"}
Tagline: ${p.tagline || ""}
Short description: ${p.short_description || ""}
Description: ${p.description || ""}
Features: ${JSON.stringify(p.features || [])}
Plans: ${JSON.stringify(p.plans || [])}
Delivery time: ${p.delivery_time || "instant"}
Warranty: ${p.warranty || ""}

The article MUST end with a CTA button-style paragraph linking to /product/${p.slug} to buy via bKash/Nagad.`;
}

function buildTopicPrompt(topic: string) {
  return `Write a helpful, SEO-optimized blog post about this topic for ramasub.com Bangladesh audience:

Topic: ${topic}

Naturally mention Rama Sub as the trusted place to buy digital subscriptions with bKash/Nagad. Link to /products and /contact where relevant.`;
}

async function saveBlog(
  sa: any,
  ai: any,
  extra: { product_slug?: string; cover_url?: string } = {},
) {
  const slug = slugify(String(ai.slug || ai.title || "post"));
  if (!slug) throw new Error("AI produced empty slug");

  const payload = {
    kind: "blog_post",
    is_active: true,
    data: {
      title: String(ai.title || "").slice(0, 120),
      slug,
      excerpt: String(ai.excerpt || "").slice(0, 300),
      meta_title: String(ai.meta_title || ai.title || "").slice(0, 70),
      meta_description: String(ai.meta_description || ai.excerpt || "").slice(0, 170),
      body: String(ai.body || ""),
      cover_url: extra.cover_url || "",
      author: "Rama Sub Team",
      product_slug: extra.product_slug || "",
      tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 8) : [],
      faq: Array.isArray(ai.faq) ? ai.faq.slice(0, 8) : [],
      published_at: new Date().toISOString(),
      generated_by: "ai",
    } as never,
  };

  // Dedupe by slug — if a post with same slug exists, update it instead
  const { data: existing } = await sa
    .from("admin_records")
    .select("id")
    .eq("kind", "blog_post")
    .filter("data->>slug", "eq", slug)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await sa
      .from("admin_records")
      .update({ data: payload.data })
      .eq("id", existing[0].id);
    if (error) throw new Error(error.message);
    return { slug, id: existing[0].id, updated: true };
  }

  const { data: inserted, error } = await sa
    .from("admin_records")
    .insert(payload as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { slug, id: (inserted as any).id, updated: false };
}

/** Generate a blog post for one product. Admin-only. */
export const generateBlogForProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");

    const { data: prod, error } = await (sa as any)
      .from("products")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !prod) throw new Error("Product not found: " + data.slug);

    const ai = await callAI(BLOG_SYSTEM, buildProductPrompt(prod));
    return saveBlog(sa as any, ai, {
      product_slug: prod.slug,
      cover_url: prod.image_url || "",
    });
  });

/** Generate blog posts for all active products that don't have one yet. Admin-only. */
export const generateBlogsForMissingProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(30).default(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    return runMissingGeneration(sa as any, data.limit);
  });

/** Generate a blog from a free-form topic. Admin-only. */
export const generateBlogFromTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ topic: z.string().min(3).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const ai = await callAI(BLOG_SYSTEM, buildTopicPrompt(data.topic));
    return saveBlog(sa as any, ai);
  });

/** Shared: iterate products missing blog and generate up to `limit` posts. */
export async function runMissingGeneration(sa: any, limit: number) {
  const { data: products, error } = await sa
    .from("products")
    .select("slug,name,category,tagline,short_description,description,features,plans,delivery_time,warranty,image_url")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const { data: existingBlogs } = await sa
    .from("admin_records")
    .select("data")
    .eq("kind", "blog_post");
  const covered = new Set<string>();
  for (const b of (existingBlogs ?? []) as Array<{ data: any }>) {
    if (b.data?.product_slug) covered.add(String(b.data.product_slug));
  }

  const missing = (products ?? []).filter((p: any) => p.slug && !covered.has(p.slug));
  const batch = missing.slice(0, limit);

  const results: Array<{ product: string; ok: boolean; slug?: string; error?: string }> = [];
  for (const p of batch) {
    try {
      const ai = await callAI(BLOG_SYSTEM, buildProductPrompt(p));
      const saved = await saveBlog(sa, ai, { product_slug: p.slug, cover_url: p.image_url || "" });
      results.push({ product: p.slug, ok: true, slug: saved.slug });
    } catch (e: any) {
      results.push({ product: p.slug, ok: false, error: e?.message || String(e) });
    }
  }
  return { attempted: batch.length, remaining: Math.max(0, missing.length - batch.length), results };
}
