import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rowToProduct, type Product } from "@/data/products";
import { validator, z, slug as slugSchema } from "@/lib/validation";

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
  .inputValidator((input: unknown) => validator(z.object({ slug: slugSchema }).strict())(input))
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

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
  });

export const deleteProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validator(z.object({ slug: z.string().min(1) }).strict())(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin.from("products").delete().eq("slug", data.slug);
    if (error) throw error;
    return { ok: true };
  });

export const bulkDeleteProductsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validator(z.object({ slugs: z.array(z.string().min(1)) }).strict())(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin.from("products").delete().in("slug", data.slugs);
    if (error) throw error;
    return { ok: true };
  });

export const updateProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validator(z.object({ slug: z.string().min(1), patch: z.record(z.unknown()) }).strict(), "POST", { input })(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin.from("products").update(data.patch as any).eq("slug", data.slug);
    if (error) throw error;
    return { ok: true };
  });

export const createProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validator(z.record(z.string(), z.unknown()))(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin.from("products").insert(data as any);
    if (error) throw error;
    return { ok: true };
  });

export const swapProductSortOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validator(z.object({ 
    slugA: z.string().min(1), orderA: z.number(), 
    slugB: z.string().min(1), orderB: z.number() 
  }).strict())(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error: e1 } = await supabaseAdmin.from("products").update({ sort_order: data.orderB }).eq("slug", data.slugA);
    const { error: e2 } = await supabaseAdmin.from("products").update({ sort_order: data.orderA }).eq("slug", data.slugB);
    if (e1 || e2) throw (e1 || e2);
    return { ok: true };
  });
