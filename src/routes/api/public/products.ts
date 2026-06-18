import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { rowToProduct } from "@/data/products";

const PRODUCT_SELECT =
  "slug,name,emoji,gradient,category,badge,tagline,description,delivery_time,warranty,features,plans,image_url";

function createPublicProductClient() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const supabaseUrl = env?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey =
    env?.SUPABASE_PUBLISHABLE_KEY ||
    env?.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Product data connection is not configured");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const Route = createFileRoute("/api/public/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug");

        let query = createPublicProductClient()
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (slug) query = query.eq("slug", slug).limit(1);

        const { data, error } = await query;
        if (error) {
          return Response.json(
            { error: "Products could not be loaded" },
            { status: 500 },
          );
        }

        const products = (data ?? []).map((row) => rowToProduct(row as never));
        return Response.json(slug ? (products[0] ?? null) : products, {
          headers: {
            // Edge/CDN caches for 5 min, browsers revalidate after 60s,
            // serves stale up to 1h while refreshing in the background.
            "Cache-Control":
              "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
            Vary: "Accept-Encoding",
          },
        });
      },
    },
  },
});