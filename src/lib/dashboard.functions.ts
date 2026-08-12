import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    // Check role first
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const [pAll, oAll, uAll, recentOrders, recentProducts] = await Promise.all([
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("orders")
        .select("id,created_at,status,total,full_name,email,payment_method,items")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("products")
        .select("slug,name,emoji,image_url,category,is_active,created_at")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    return {
      counts: {
        products: pAll.count ?? 0,
        orders: oAll.count ?? 0,
        users: uAll.count ?? 0,
      },
      recentOrders: recentOrders.data ?? [],
      recentProducts: recentProducts.data ?? [],
    };
  });
