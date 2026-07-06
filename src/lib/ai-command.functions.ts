import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";

/**
 * AI Command Center — server functions.
 * All handlers require an authenticated admin (verified via has_role RPC).
 */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

async function getModel(preferred: "flash" | "pro" = "flash") {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);
  return preferred === "pro"
    ? gateway("google/gemini-2.5-pro")
    : gateway("google/gemini-2.5-flash");
}

// ─────────────────────────────────────────────────────────────────────
// Tools available to Admin AI Assistant
// ─────────────────────────────────────────────────────────────────────

function buildTools(admin: any) {
  return {
    getStats: tool({
      description:
        "Get high-level store stats: total orders, revenue, pending orders, completed orders, customer count. Optional 'sinceDays' to limit window (default 30).",
      inputSchema: z.object({ sinceDays: z.number().int().min(1).max(365).optional() }),
      execute: async ({ sinceDays }) => {
        const days = sinceDays ?? 30;
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const [ordAll, ordPending, ordCompleted, revAgg, custCount] = await Promise.all([
          admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since),
          admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", since),
          admin.from("orders").select("id", { count: "exact", head: true }).in("status", ["completed", "delivered"]).gte("created_at", since),
          admin.from("orders").select("total").in("status", ["completed", "delivered"]).gte("created_at", since),
          admin.from("profiles").select("id", { count: "exact", head: true }),
        ]);
        const revenue = (revAgg.data ?? []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
        return {
          window_days: days,
          total_orders: ordAll.count ?? 0,
          pending_orders: ordPending.count ?? 0,
          completed_orders: ordCompleted.count ?? 0,
          revenue_bdt: revenue,
          total_customers: custCount.count ?? 0,
        };
      },
    }),

    searchOrders: tool({
      description:
        "Search recent orders. Filters: email (substring), status ('pending'|'completed'|'delivered'|'cancelled'|'failed'), limit (default 10).",
      inputSchema: z.object({
        email: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ email, status, limit }) => {
        let q = admin
          .from("orders")
          .select("id, full_name, email, phone, total, status, payment_method, created_at")
          .order("created_at", { ascending: false })
          .limit(limit ?? 10);
        if (email) q = q.ilike("email", `%${email}%`);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { orders: data ?? [] };
      },
    }),

    topProducts: tool({
      description: "Return top selling products (by order count) in the last N days (default 30).",
      inputSchema: z.object({ sinceDays: z.number().int().min(1).max(365).optional(), limit: z.number().int().min(1).max(20).optional() }),
      execute: async ({ sinceDays, limit }) => {
        const since = new Date(Date.now() - (sinceDays ?? 30) * 86400_000).toISOString();
        const { data, error } = await admin
          .from("orders")
          .select("items")
          .gte("created_at", since)
          .in("status", ["completed", "delivered"]);
        if (error) return { error: error.message };
        const tally = new Map<string, { name: string; qty: number; revenue: number }>();
        for (const row of data ?? []) {
          const items = Array.isArray(row.items) ? row.items : [];
          for (const it of items as any[]) {
            const name = it?.name ?? it?.slug ?? "unknown";
            const qty = Number(it?.quantity ?? 1);
            const price = Number(it?.price ?? 0);
            const cur = tally.get(name) ?? { name, qty: 0, revenue: 0 };
            cur.qty += qty;
            cur.revenue += qty * price;
            tally.set(name, cur);
          }
        }
        const top = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, limit ?? 10);
        return { top };
      },
    }),

    searchProducts: tool({
      description: "Search products by name or slug substring.",
      inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(30).optional() }),
      execute: async ({ query, limit }) => {
        const { data, error } = await admin
          .from("products")
          .select("slug, name, category, price, is_active")
          .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
          .limit(limit ?? 10);
        if (error) return { error: error.message };
        return { products: data ?? [] };
      },
    }),

    searchCustomers: tool({
      description: "Search customers by email or display name substring.",
      inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(30).optional() }),
      execute: async ({ query, limit }) => {
        const { data, error } = await admin
          .from("profiles")
          .select("id, display_name, phone")
          .or(`display_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(limit ?? 10);
        if (error) return { error: error.message };
        return { customers: data ?? [] };
      },
    }),

    revenueByDay: tool({
      description: "Daily revenue and order counts for the last N days (default 14). Useful for trend/forecast analysis.",
      inputSchema: z.object({ sinceDays: z.number().int().min(1).max(180).optional() }),
      execute: async ({ sinceDays }) => {
        const days = sinceDays ?? 14;
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const { data, error } = await admin
          .from("orders")
          .select("total, status, created_at")
          .gte("created_at", since);
        if (error) return { error: error.message };
        const byDay = new Map<string, { orders: number; revenue: number }>();
        for (const r of data ?? []) {
          const d = new Date(r.created_at).toISOString().slice(0, 10);
          const cur = byDay.get(d) ?? { orders: 0, revenue: 0 };
          cur.orders += 1;
          if (["completed", "delivered"].includes(String(r.status))) cur.revenue += Number(r.total || 0);
          byDay.set(d, cur);
        }
        const series = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));
        return { series };
      },
    }),
  } as const;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Admin AI Assistant (chat with tools)
// ─────────────────────────────────────────────────────────────────────

export const adminChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      system?: string;
    }) => ({
      messages: (input?.messages ?? []).slice(-30).map((m) => ({
        role: m.role,
        content: String(m.content ?? "").slice(0, 8000),
      })),
      system: input?.system?.slice(0, 4000),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const model = getModel("flash");
    const tools = buildTools(supabaseAdmin);

    const system =
      data.system ??
      `You are the AI Command Center for the "Rama Sub" e-commerce admin panel (digital software/subscription store in Bangladesh, currency BDT ৳).
- Answer briefly and helpfully in the language the admin uses (Bangla or English).
- Use the provided tools to fetch real data before answering factual questions about orders, products, revenue, customers.
- Never invent numbers. If a tool errors, report it briefly.
- Format money as "৳X". Use markdown tables for lists.`;

    const modelMessages: ModelMessage[] = [
      { role: "system", content: system },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const result = await generateText({
        model,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(8),
      });
      return { ok: true, text: result.text, toolCalls: result.toolCalls?.length ?? 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI error";
      return { ok: false, text: `AI error: ${msg}` };
    }
  });

// ─────────────────────────────────────────────────────────────────────
// 2. Content / Marketing Studio
// ─────────────────────────────────────────────────────────────────────

const CONTENT_KINDS = [
  "product_description",
  "seo_title_meta",
  "email_marketing",
  "telegram_broadcast",
  "social_caption",
  "review_reply",
  "whatsapp_message",
] as const;

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind: (typeof CONTENT_KINDS)[number];
      brief: string;
      tone?: "friendly" | "professional" | "excited" | "urgent";
      language?: "bn" | "en" | "mixed";
    }) => ({
      kind: CONTENT_KINDS.includes(input.kind) ? input.kind : "product_description",
      brief: String(input?.brief ?? "").slice(0, 4000),
      tone: input?.tone ?? "friendly",
      language: input?.language ?? "bn",
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const model = getModel("flash");

    const lang =
      data.language === "bn"
        ? "Bengali (বাংলা)"
        : data.language === "en"
          ? "English"
          : "mixed Bengali+English (Banglish is fine)";
    const kindGuide: Record<string, string> = {
      product_description: `Write a compelling product description with 1 hook line, 3-5 bullet features, and a short call-to-action.`,
      seo_title_meta: `Output exactly:\nTitle: <SEO title, under 60 chars>\nDescription: <meta description, under 155 chars>\nSlug: <lowercase-hyphenated-slug>\nKeywords: <5-8 comma separated>`,
      email_marketing: `Write a marketing email with subject, preview text, and body (short paragraphs + one CTA button label).`,
      telegram_broadcast: `Write a Telegram broadcast (max 500 chars) with emojis + one clear CTA + optional bold headers using *asterisks*.`,
      social_caption: `Write a Facebook/Instagram caption (max 300 chars) with 3-6 relevant hashtags at the end.`,
      review_reply: `Write a warm, thoughtful reply to a customer review. Thank them + address any concern + keep it under 3 sentences.`,
      whatsapp_message: `Write a short WhatsApp message (under 400 chars) in a natural conversational tone.`,
    };

    const prompt = `You are the content studio for Rama Sub (digital subscription/software store, Bangladesh).
Language: ${lang}
Tone: ${data.tone}
Task: ${kindGuide[data.kind]}

INPUT / BRIEF FROM ADMIN:
${data.brief}

Respond with ONLY the final content — no preamble, no explanation.`;

    try {
      const result = await generateText({ model, prompt });
      return { ok: true, text: result.text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI error";
      return { ok: false, text: `AI error: ${msg}` };
    }
  });

// ─────────────────────────────────────────────────────────────────────
// 3. Analytics / Insights (NL question → tool-backed answer)
// ─────────────────────────────────────────────────────────────────────

export const analyticsAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string }) => ({
    question: String(input?.question ?? "").slice(0, 1000),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const model = getModel("pro");
    const tools = buildTools(supabaseAdmin);

    const system = `You are the analytics brain for Rama Sub admin. Use the tools to fetch real data, then produce a concise insight report.

RULES:
- Always call at least one relevant tool before answering (getStats, revenueByDay, topProducts, searchOrders as needed).
- Format the reply as a short markdown report:
  ## সারসংক্ষেপ / Summary  (2-3 line takeaway)
  ## মূল সংখ্যা / Key Numbers  (bullet list with real numbers, format money as ৳X)
  ## ট্রেন্ড / Trend  (1-2 lines on what's rising/falling)
  ## পরামর্শ / Suggestion  (1-2 actionable ideas)
- Language: match the admin's question language.`;

    try {
      const result = await generateText({
        model,
        system,
        prompt: data.question,
        tools,
        stopWhen: stepCountIs(6),
      });
      return { ok: true, text: result.text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI error";
      return { ok: false, text: `AI error: ${msg}` };
    }
  });
