// Generates a personalized renewal reminder email body via Lovable AI Gateway.
// Returns: { subject: string, body: string }
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
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

type Body = {
  product?: string;
  customerName?: string;
  expiresOn?: string;
  daysLeft?: number | null;
  language?: "bn" | "en" | "mixed";
  tone?: string;
  notes?: string;
  coupon?: { code?: string; discount?: number; validDays?: number; offerText?: string } | null;
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

    const {
      product = "subscription",
      customerName = "",
      expiresOn = "",
      daysLeft = null,
      language = "bn",
      tone = "professional, warm, friendly",
      notes = "",
      coupon = null,
    } = (await req.json()) as Body;

    const langText =
      language === "en"
        ? "Write the email in clean conversational English."
        : language === "mixed"
        ? "Write in Bangla (Bengali script) with light English mixing where natural."
        : "Write in natural Bangla (Bengali script).";

    const couponText = coupon?.code
      ? `Include this exclusive coupon as a highlight: code "${coupon.code}", ${coupon.discount ?? 0}% off, valid ${coupon.validDays ?? 7} days.${coupon.offerText ? ` Extra note: ${coupon.offerText}.` : ""}`
      : "Do not invent any coupon code.";

    const sys =
      "You write concise, friendly renewal-reminder emails for AccessNow BD (a Bangladeshi premium digital-products shop). Output STRICT JSON via the provided tool.";
    const user = `Generate a renewal reminder email.
${langText}
Tone: ${tone}.
Customer name: ${customerName || "(unknown — start with a friendly greeting)"}.
Product: ${product}.
Expires on: ${expiresOn || "soon"}.${typeof daysLeft === "number" ? ` Days left: ${daysLeft}.` : ""}
${couponText}
${notes ? `Extra context for you: ${notes}.` : ""}

Rules:
- Keep body 3–5 short paragraphs, mobile-friendly.
- Mention service uninterrupted, 24/7 support, easy bKash/Nagad renewal.
- Include a clear call to renew (no specific URL — just say "renew now" / "renew today").
- No markdown, no HTML — plain text with blank lines between paragraphs.
- Subject: 6–10 words, no clickbait.`;

    const tool = {
      type: "function",
      function: {
        name: "write_renewal_email",
        parameters: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
          required: ["subject", "body"],
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
        tool_choice: { type: "function", function: { name: "write_renewal_email" } },
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
    console.error("renewal-email-ai error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500, cors);
  }
});
