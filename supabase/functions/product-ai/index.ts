// Generates product copy & images via Lovable AI Gateway.
// Modes:
//  - "short" → tagline + short_description
//  - "rich"  → long markdown description + SEO meta + tags
//  - "all"   → everything (tagline, short, description, features, seo)
//  - "image" → AI-generated product image (returns data URL)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/accessnowbd\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/(www\.)?accessnowbd\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];
function corsFor(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": allow ? origin : "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

type Mode = "short" | "rich" | "all" | "image" | "seo";
type CardStyle = "premium-pastel" | "premium-dark" | "glassmorphism" | "soft-aurora" | "dark-neon";

type Body = {
  mode: Mode;
  product: {
    name: string;
    category?: string;
    tagline?: string;
    description?: string;
    features?: string[];
  };
  imagePrompt?: string;
  style?: CardStyle;
};

/**
 * Shared layout used by every premium preset. Only the colour palette /
 * background mood changes per preset — the composition is identical so the
 * cards look like one consistent product series.
 *
 * Reference: AccessNow BD "Premium Digital Services" promo cards (Gemini AI
 * Advance / Claude Pro / Canva Pro / QuillBot Premium style).
 */
const SHARED_LAYOUT = `
Build a premium 1:1 square social-media promo card with this EXACT composition:

OUTER FRAME: thin glowing rounded-rectangle border in the preset accent colour, with a subtle inner double-line. Faint dark background fills with very low-opacity blurred screenshots of the actual product's real UI (web/app interface) — barely visible, used only as ambience behind the foreground.

HERO ROW (top 55% of card, two columns):
  LEFT — one large 3D rounded-square "app icon" tile (~38% of card width), glossy glass material with a soft top highlight and the preset accent-colour rim glow. Inside the tile place the OFFICIAL recognizable brand logo of the product (correct colours, crisp, centered, large), and under the logo place the brand wordmark in its real typeface. A small "Google" / publisher caption may sit under it if the brand is published by a parent company.
  RIGHT — the product display name in MASSIVE bold sans-serif (Inter / SF Pro style), 2 lines, white for the first word and a vivid preset-accent gradient for the second word (e.g. "Claude" white + "Pro" orange-gradient, "Gemini AI" white + "Advance" violet-gradient). End the wordmark with a small 4-point sparkle glyph in the accent colour.

FEATURE ROW (bottom 35%): three equal rounded-square dark glass cards side by side. Each card has the preset accent-colour rim glow, a circular icon badge at the top (line icon in accent colour — pick icons that fit the feature), a bold short feature TITLE (2-3 words, white), and a 2-3 line feature description in soft light-grey. Use the 3 features supplied; if fewer than 3 are supplied invent plausible ones that match the product.

FOOTER STRIP (very bottom): centered tagline "Fast • Secure • Reliable" with two small accent-colour dots as separators, sitting above a thin divider line. Bottom-left: a dark pill containing a globe icon + the text "accessnowbd.com". Bottom-right: the AccessNow BD logomark — a stylised letter "A" in the accent colour next to the words "AccessNow" (white) with a tiny red "BD" badge under the "A", and the small caption "Premium Digital Services" under "AccessNow".

QUALITY: cinematic studio render, ultra crisp, no extra text anywhere, no watermark, no Lorem Ipsum, no UI chrome outside the described frame. Render ONLY the text that is explicitly listed (brand name, feature titles + descriptions, "Fast • Secure • Reliable", "accessnowbd.com", "AccessNow BD", "Premium Digital Services"). Spell every word correctly.
`.trim();

const STYLE_PROMPTS: Record<CardStyle, string> = {
  // Pastel Glass → bright violet / magenta neon (Canva-Pro reference)
  "premium-pastel":
    `${SHARED_LAYOUT}\n\nPRESET — "Pastel Glass": near-black background, vivid violet→magenta neon glow on the outer frame, hero tile and feature cards. Brand-name accent word uses a cyan→violet→pink gradient. Bullet dots in the footer are bright magenta.`,
  // Dark Luxe → warm orange / amber neon (Claude-Pro reference)
  "premium-dark":
    `${SHARED_LAYOUT}\n\nPRESET — "Dark Luxe": deep near-black background with very subtle warm vignette, glowing amber→orange neon on the outer frame, hero tile rim and feature card rims. Brand-name accent word uses a saturated orange gradient. Bullet dots in the footer are orange.`,
  // legacy compatibility — same as pastel
  "glassmorphism":
    `${SHARED_LAYOUT}\n\nPRESET — "Pastel Glass": near-black background, vivid violet→magenta neon glow on the outer frame, hero tile and feature cards. Brand-name accent word uses a cyan→violet→pink gradient. Bullet dots in the footer are bright magenta.`,
  // Soft Aurora → emerald / lime neon (QuillBot reference)
  "soft-aurora":
    `${SHARED_LAYOUT}\n\nPRESET — "Soft Aurora": near-black background with a soft emerald glow, bright lime→emerald neon on the outer frame, hero tile and feature cards. Brand-name accent word uses a green gradient (lime to deep emerald). Bullet dots in the footer are bright green.`,
  // Neon Edge → electric blue / violet neon (Gemini reference)
  "dark-neon":
    `${SHARED_LAYOUT}\n\nPRESET — "Neon Edge": near-black background with a cool blue ambience, electric blue→violet neon on the outer frame, hero tile and feature cards, plus a faint starfield. Brand-name accent word uses a blue→violet→pink gradient. Bullet dots in the footer are blue and violet.`,
};

const SHOP_BRAND = "AccessNow BD";


const json = (body: unknown, status = 200, corsHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function requireAdmin(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json({ error: "Unauthorized" }, 401, corsHeaders);
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supaUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500, corsHeaders);
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Unauthorized" }, 401, corsHeaders);
  const user = await userRes.json();
  if (!user?.id) return json({ error: "Unauthorized" }, 401, corsHeaders);
  const roleRes = await fetch(
    `${supaUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!roleRes.ok) return json({ error: "Forbidden" }, 403, corsHeaders);
  const rows = await roleRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: "Forbidden: admin role required" }, 403, corsHeaders);
  }
  return null;
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const denied = await requireAdmin(req, corsHeaders);
    if (denied) return denied;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    const { mode, product, imagePrompt, style } = (await req.json()) as Body;
    if (!product?.name) throw new Error("product.name is required");


    // ===== IMAGE GENERATION =====
    // Prefer Lovable AI Gateway (no extra key needed). Fallback to direct
    // Gemini API if a GEMINI_API_KEY is configured on the project.
    if (mode === "image") {
      const styleId: CardStyle = (style as CardStyle) || "premium-pastel";
      const styleText = STYLE_PROMPTS[styleId] ?? STYLE_PROMPTS["premium-pastel"];
      const isPremium = styleId !== "glassmorphism";
      const subjectLine = `Subject / product being showcased: "${product.name}"${product.category ? ` (${product.category})` : ""}.`;
      const featureList = (product.features ?? []).filter((f) => typeof f === "string" && f.trim()).slice(0, 3);
      const featuresLine = featureList.length
        ? ` Use these 3 features verbatim for the bottom feature cards (title + one short supporting line each): ${featureList.map((f, i) => `${i + 1}) ${f}`).join("  ")}.`
        : " For the three feature cards invent 3 short premium-sounding features that genuinely fit this product (each: 2-3 word TITLE + 2-3 line description).";
      const userExtra = imagePrompt?.trim() ? ` Additional creative direction from the operator: ${imagePrompt.trim()}.` : "";
      const prompt = isPremium
        ? `${styleText}\n\n${subjectLine}${featuresLine}${userExtra}\n\nRender only the text described in the layout (brand wordmark, the 3 feature titles + descriptions, "Fast • Secure • Reliable", "accessnowbd.com", "AccessNow BD", "Premium Digital Services"). No other text, no watermark. Ultra high detail, 1:1 square.`
        : (imagePrompt?.trim() || `${styleText}. ${subjectLine} Branded for ${SHOP_BRAND}. 1:1 square, ultra high detail, no text, no watermark.`);

      // ---- Path A: Lovable AI Gateway (preferred) — Nano Banana 2 with fallback ----
      if (apiKey) {
        const models = ["google/gemini-3.1-flash-image-preview", "google/gemini-2.5-flash-image-preview"];
        for (const model of models) {
          try {
            const gw = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                modalities: ["image", "text"],
              }),
            });
            if (gw.status === 429) return json({ error: "Rate limited, please retry shortly." }, 429, corsHeaders);
            if (gw.status === 402) return json({ error: "AI credits exhausted. Add credits in Lovable workspace." }, 402, corsHeaders);
            if (gw.ok) {
              const gd = await gw.json();
              const msg = gd?.choices?.[0]?.message ?? {};
              const url: string | undefined =
                msg?.images?.[0]?.image_url?.url ||
                msg?.images?.[0]?.url ||
                (Array.isArray(msg?.content)
                  ? msg.content.find((c: any) => c?.image_url?.url)?.image_url?.url
                  : undefined);
              if (url) return json({ image: url }, 200, corsHeaders);
              console.error(`gateway ${model} returned no image`, JSON.stringify(gd).slice(0, 400));
            } else {
              console.error(`gateway ${model} error`, gw.status, (await gw.text()).slice(0, 200));
            }
          } catch (e) {
            console.error(`gateway ${model} exception`, e);
          }
        }
      }

      // ---- Path B: Direct Gemini API ----
      if (geminiKey) {
        const model = "gemini-2.5-flash-image-preview";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        });
        if (r.status === 429) return json({ error: "Gemini rate limit, please retry shortly." }, 429, corsHeaders);
        if (!r.ok) {
          const t = await r.text();
          console.error("gemini image error", r.status, t);
          return json({ error: `Gemini API error (${r.status}): ${t.slice(0, 200)}` }, 500, corsHeaders);
        }
        const data = await r.json();
        const parts = data?.candidates?.[0]?.content?.parts ?? [];
        const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData;
        if (!inline?.data) {
          console.error("no image in gemini response", JSON.stringify(data).slice(0, 400));
          return json({ error: "No image returned from Gemini" }, 500, corsHeaders);
        }
        const mime = inline.mimeType || "image/png";
        return json({ image: `data:${mime};base64,${inline.data}` }, 200, corsHeaders);
      }

      return json({ error: "No image provider configured. Add LOVABLE_API_KEY or GEMINI_API_KEY." }, 500, corsHeaders);
    }

    // ===== TEXT GENERATION (still via Lovable AI Gateway) =====
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // ===== TEXT GENERATION =====
    // STRUCTURED DESCRIPTION TEMPLATE — fetched from admin_records so admins can
    // edit section order / headings from the admin panel without redeploying.
    const DEFAULT_DESCRIPTION_TEMPLATE = `
The "description" field MUST be markdown that follows EXACTLY this section order and headings (in clean English, with Bangla "Note" line at the end). Tailor every line to the specific product, brand and category — never leave placeholder text.

## {Product Name} – {one-line value proposition}

{2-4 sentence intro paragraph.}

## Choose Your {Brand} Plan

### 🟪 {Plan 1 name} – {duration}
- {benefit}

### 🟦 {Plan 2 name} – {duration}
- {benefit}

## Powerful {Brand} Features
- {feature}

## Perfect For
- **Content Creators** – {reason}

## Why Buy From AccessNow BD
- Trusted digital subscription provider in Bangladesh
- Secure delivery with verified access
- Fast customer support

## Delivery Information
- Delivery time: within 1–2 hours during office hours

**Note:** Some {Brand} features may be region-dependent and availability in Bangladesh may vary.
`;

    let DESCRIPTION_TEMPLATE = DEFAULT_DESCRIPTION_TEMPLATE;
    try {
      const supaUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supaUrl && serviceKey) {
        const r = await fetch(
          `${supaUrl}/rest/v1/admin_records?kind=eq.description_template&is_active=eq.true&select=data&order=updated_at.desc&limit=1`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        if (r.ok) {
          const rows = await r.json();
          const tpl = rows?.[0]?.data?.template;
          if (typeof tpl === "string" && tpl.trim().length > 50) {
            DESCRIPTION_TEMPLATE = tpl;
          }
        }
      }
    } catch (e) {
      console.error("template fetch failed, using default", e);
    }

    const systems: Record<Exclude<Mode, "image">, string> = {
      short:
        "You write concise, persuasive Bangladeshi e-commerce product copy in clean English. Output STRICT JSON only.",
      rich:
        "You write rich, SEO-optimised Bangladeshi e-commerce product descriptions in clean English markdown for AccessNow BD. You ALWAYS follow the provided section template exactly. Output STRICT JSON only.",
      all:
        "You are an expert Bangladeshi e-commerce copywriter for AccessNow BD. You ALWAYS write the long description following the provided sectioned markdown template exactly. Output STRICT JSON only.",
      seo:
        "You are a senior SEO copywriter for AccessNow BD (Bangladesh's trusted digital subscription store). You craft Google-friendly, click-worthy meta tags that rank for buyer-intent keywords like 'buy {product} in Bangladesh', '{product} BD price', '{product} subscription Bangladesh'. Output STRICT JSON only — no commentary.",
    };

    const prompts: Record<Exclude<Mode, "image">, string> = {
      short: `Generate copy for this digital product. Keep tagline under 70 chars and short_description 2-3 short sentences. Return JSON: { "tagline": string, "short_description": string }.\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      rich: `Generate rich SEO copy. Return JSON: { "description": string, "seo_title": string (max 60 chars), "seo_description": string (max 155 chars), "tags": string[] (5-8 keywords) }.\n\nThe "description" MUST follow this template exactly:\n${DESCRIPTION_TEMPLATE}\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      all: `Generate the full listing for this product. Return JSON with: tagline (under 70 chars), short_description (2-3 sentences), description (markdown following the template below EXACTLY), features (array of 5-8 short bullet strings), seo_title (max 60 chars), seo_description (max 155 chars), tags (array of 5-8 keywords).\n\nDescription template (MANDATORY):\n${DESCRIPTION_TEMPLATE}\n\nProduct:\n${JSON.stringify(product, null, 2)}`,
      seo: `Write Google-ranking SEO meta tags for this product page on accessnowbd.com.

Rules:
- seo_title: 50–60 chars. MUST start with the product/brand name + a buyer-intent keyword (e.g. "Buy", "Price", "Subscription"). Include "Bangladesh" or "BD". End with " | AccessNow BD". Use a power word (Cheap, Official, Premium, Genuine, Instant) when natural.
- seo_description: 140–160 chars. Mention the product name + key benefit + price/availability cue (e.g. "best price", "instant delivery", "official subscription"). Include "Bangladesh" / "BD". End with a soft call-to-action ("Order now", "Get yours today"). Natural, no keyword stuffing.
- tags: 6–10 lowercase long-tail keywords a Bangladeshi buyer would search (e.g. "buy {name} bangladesh", "{name} bd price", "{name} subscription bd", "cheap {name} bangladesh").

Return JSON: { "seo_title": string, "seo_description": string, "tags": string[] }.

Product:
${JSON.stringify(product, null, 2)}`,
    };

    const tools: Record<Exclude<Mode, "image">, unknown> = {
      short: {
        type: "function",
        function: {
          name: "write_short_copy",
          parameters: {
            type: "object",
            properties: {
              tagline: { type: "string" },
              short_description: { type: "string" },
            },
            required: ["tagline", "short_description"],
            additionalProperties: false,
          },
        },
      },
      rich: {
        type: "function",
        function: {
          name: "write_rich_copy",
          parameters: {
            type: "object",
            properties: {
              description: { type: "string" },
              seo_title: { type: "string" },
              seo_description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["description", "seo_title", "seo_description", "tags"],
            additionalProperties: false,
          },
        },
      },
      all: {
        type: "function",
        function: {
          name: "write_full_listing",
          parameters: {
            type: "object",
            properties: {
              tagline: { type: "string" },
              short_description: { type: "string" },
              description: { type: "string" },
              features: { type: "array", items: { type: "string" } },
              seo_title: { type: "string" },
              seo_description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
            required: [
              "tagline",
              "short_description",
              "description",
              "features",
              "seo_title",
              "seo_description",
              "tags",
            ],
            additionalProperties: false,
          },
        },
      },
      seo: {
        type: "function",
        function: {
          name: "write_seo_meta",
          parameters: {
            type: "object",
            properties: {
              seo_title: { type: "string" },
              seo_description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["seo_title", "seo_description", "tags"],
            additionalProperties: false,
          },
        },
      },
    };

    const key = mode as Exclude<Mode, "image">;
    const tool = tools[key] as { function: { name: string } };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systems[key] },
          { role: "user", content: prompts[key] },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (r.status === 429) return json({ error: "Rate limit, please retry shortly." }, 429, corsHeaders);
    if (r.status === 402) return json({ error: "AI credits exhausted." }, 402, corsHeaders);
    if (!r.ok) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      return json({ error: "AI gateway error" }, 500, corsHeaders);
    }
    const data = await r.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    return json(JSON.parse(args), 200, corsHeaders);
  } catch (e) {
    console.error("product-ai error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500, corsHeaders);
  }
});
