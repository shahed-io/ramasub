import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { deliverDownloadsInternal } from "@/lib/software-downloads.functions";

/**
 * Auto-delivery endpoint. Called by a DB trigger (via pg_net) whenever an
 * order status transitions to 'completed'. Protected by BLOG_AUTOGEN_SECRET
 * (reused as the shared internal cron secret).
 */
export const Route = createFileRoute("/api/public/deliver-downloads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provided =
          url.searchParams.get("secret") ||
          request.headers.get("x-autogen-secret") ||
          "";
        const expected = process.env.BLOG_AUTOGEN_SECRET || "";
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: any = {};
        try { body = await request.json(); } catch { /* noop */ }
        const orderId = body?.orderId || url.searchParams.get("orderId");
        if (!orderId) return new Response("orderId required", { status: 400 });

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        try {
          const r = await deliverDownloadsInternal(sb, orderId);
          return new Response(JSON.stringify(r), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
