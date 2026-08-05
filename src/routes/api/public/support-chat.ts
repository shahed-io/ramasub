import { createFileRoute } from "@tanstack/react-router";
import {
  BASE_SYSTEM_PROMPT,
  GUEST_CONTEXT_BLOCK,
  buildLiveContext,
  buildSignedInContext,
  lookupMentionedCoupons,
  type ChatMsg,
} from "@/lib/support-chat.server";

import { z } from "@/lib/validation";

const MAX_MESSAGES = 24;
const MAX_CONTENT_LEN = 4000;

/** Strict transcript schema — anything that doesn't match is rejected, not cleaned. */
const ChatRequest = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(MAX_CONTENT_LEN),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_MESSAGES),
  })
  .strict();

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Same-origin AI support chat endpoint (streams Server-Sent Events).
 * The assistant is grounded in live catalogue/coupon data so it cannot
 * invent prices or promo codes.
 */
export const Route = createFileRoute("/api/public/support-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { guardPublicRoute, tooManyRequests } = await import("@/lib/rate-limit.server");
        const rl = await guardPublicRoute("public.support_chat", request);
        if (!rl.allowed) return tooManyRequests(rl);

        let messages: ChatMsg[];
        try {
          const parsed = ChatRequest.safeParse(await request.json());
          if (!parsed.success) {
            return json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
          }
          messages = parsed.data.messages;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }


        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: "AI সার্ভিস কনফিগার করা নেই।" }, 500);

        const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        // Identify the caller from their own bearer token (never trust a
        // client-supplied identity) so replies are personalised when signed in.
        const bearer = request.headers.get("authorization") ?? "";
        const accessToken = bearer.toLowerCase().startsWith("bearer ")
          ? bearer.slice(7).trim()
          : null;

        let context = "";
        let identity = GUEST_CONTEXT_BLOCK;
        try {
          const [live, coupons, signedIn] = await Promise.all([
            buildLiveContext(),
            lookupMentionedCoupons(lastUser),
            buildSignedInContext(accessToken).catch(() => null),
          ]);
          context = `${live}${coupons}`;
          if (signedIn) identity = signedIn.block;
        } catch (e) {
          console.error("support-chat context error", e);
        }

        const system = context
          ? `${BASE_SYSTEM_PROMPT}\n\n${identity}\n\n=== লাইভ ডেটা (${new Date().toISOString().slice(0, 10)}) ===\n${context}`
          : `${BASE_SYSTEM_PROMPT}\n\n${identity}`;


        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages: [{ role: "system", content: system }, ...messages],
              stream: true,
            }),
          });
        } catch (e) {
          console.error("support-chat upstream fetch failed", e);
          return json({ error: "AI সার্ভিসে পৌঁছানো যাচ্ছে না। WhatsApp-এ যোগাযোগ করুন।" }, 502);
        }

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("support-chat gateway error", upstream.status, detail);
          if (upstream.status === 429) {
            return json({ error: "একটু পরে আবার চেষ্টা করুন — এখন অনেক রিকোয়েস্ট আসছে।" }, 429);
          }
          if (upstream.status === 402) {
            return json({ error: "AI ক্রেডিট শেষ হয়ে গেছে — অনুগ্রহ করে WhatsApp-এ যোগাযোগ করুন।" }, 402);
          }
          return json({ error: "AI সার্ভিসে সমস্যা হচ্ছে। WhatsApp-এ যোগাযোগ করুন।" }, 502);
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
