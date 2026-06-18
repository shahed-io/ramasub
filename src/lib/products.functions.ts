import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { rowToProduct, type Product } from "@/data/products";

const PRODUCT_SELECT =
  "slug,name,emoji,gradient,category,badge,tagline,description,delivery_time,warranty,features,plans,image_url,short_description,meta";

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

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[]> => {
    const { data, error } = await createPublicProductClient()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Products could not be loaded");
    return (data ?? []).map((row) => rowToProduct(row as never));
  },
);

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<Product | null> => {
    const { data: rows, error } = await createPublicProductClient()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("slug", data.slug)
      .limit(1);
    if (error) throw new Error("Product could not be loaded");
    const row = rows?.[0];
    return row ? rowToProduct(row as never) : null;
  });
