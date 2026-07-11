import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runMissingGeneration } from "@/lib/blogs.functions";

/**
 * Auto-generation endpoint. Called by pg_cron on a schedule to generate
 * blog posts for any new products missing one. Protected by shared secret.
 *
 * Usage: POST /api/public/generate-blogs?secret=... or with `X-Autogen-Secret` header.
 */
export const Route = createFileRoute("/api/public/generate-blogs")({
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

        const supabaseUrl = process.env.SUPABASE_URL!;
        const serviceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.SUPABASE_SERVICE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        try {
          const limit = Number(url.searchParams.get("limit") || "5");
          const result = await runMissingGeneration(sb, Math.min(Math.max(limit, 1), 20));
          return new Response(JSON.stringify(result), {
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
