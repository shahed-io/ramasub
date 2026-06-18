// Generates realistic customer reviews for products via Lovable AI Gateway.
// Returns: { reviews: [{ reviewer_name, rating, comment }] }
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

type Body = {
  product: { name: string; category?: string; tagline?: string };
  count?: number;             // default 5
  language?: "bn" | "en" | "mixed"; // default "mixed"
  ratingBias?: "high" | "balanced"; // default "high" (mostly 4-5★)
};

const json = (b: unknown, status = 200, h: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status, headers: { ...h, "Content-Type": "application/json" } });

async function requireAdmin(req: Request, cors: Record<string, string>): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json({ error: "Unauthorized" }, 401, cors);
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supaUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500, cors);
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Unauthorized" }, 401, cors);
  const user = await userRes.json();
  if (!user?.id) return json({ error: "Unauthorized" }, 401, cors);
  const roleRes = await fetch(
    `${supaUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!roleRes.ok) return json({ error: "Forbidden" }, 403, cors);
  const rows = await roleRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: "Forbidden: admin role required" }, 403, cors);
  }
  return null;
}

serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const denied = await requireAdmin(req, cors);
    if (denied) return denied;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { product, count = 5, language = "mixed", ratingBias = "high" } = (await req.json()) as Body;
    if (!product?.name) throw new Error("product.name is required");


    const n = Math.max(1, Math.min(20, Number(count) || 5));
    const langText =
      language === "bn"
        ? "All comments in natural Bangla (Bengali script)."
        : language === "en"
        ? "All comments in clean conversational English."
        : "Mix Bangla (Bengali script) and English comments — roughly 60% Bangla, 40% English. Some may be Banglish (Bangla in Latin letters).";
    const ratingText =
      ratingBias === "balanced"
        ? "Ratings should be a realistic spread: mostly 4-5 stars, occasionally 3."
        : "Most ratings should be 5 stars, a few 4 stars. No ratings below 4.";

    const sys =
      "You generate realistic, varied Bangladeshi customer reviews for a digital-products shop (AccessNow BD). Avoid generic filler. Each review feels like a real human wrote it. Output STRICT JSON only via the provided tool.";
    const user = `Generate ${n} unique customer reviews for this product. ${langText} ${ratingText}
- reviewer_name: realistic Bangladeshi names (mix of Bangla and English script names, both male & female). No duplicates.
- comment: 1-3 short sentences each. Mention specifics like fast delivery, good price, working perfectly, customer support, etc. Avoid repeating the same opening phrase. No emojis required but a few may include 1 emoji.
- rating: integer 1-5 per rules above.

Product:
${JSON.stringify(product, null, 2)}`;

    const tool = {
      type: "function",
      function: {
        name: "write_reviews",
        parameters: {
          type: "object",
          properties: {
            reviews: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  reviewer_name: { type: "string" },
                  rating: { type: "integer" },
                  comment: { type: "string" },
                },
                required: ["reviewer_name", "rating", "comment"],
                additionalProperties: false,
              },
            },
          },
          required: ["reviews"],
          additionalProperties: false,
        },
      },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "write_reviews" } },
      }),
    });

    if (r.status === 429) return json({ error: "Rate limit, please retry shortly." }, 429, cors);
    if (r.status === 402) return json({ error: "AI credits exhausted." }, 402, cors);
    if (!r.ok) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      return json({ error: "AI gateway error" }, 500, cors);
    }
    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    const parsed = JSON.parse(args);
    return json(parsed, 200, cors);
  } catch (e) {
    console.error("review-generator error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500, cors);
  }
});
