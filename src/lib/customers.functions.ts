import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export type CustomerDetail = {
  id: string;
  email: string | null;
  email_confirmed: boolean;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  provider: string | null;
  orders_count: number;
  orders_paid: number;
  total_spent: number;
  last_order_at: string | null;
  wallet_balance: number;
  reviews_count: number;
  tickets_open: number;
};

type AuthUserLite = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  app_metadata?: { provider?: string };
};

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerDetail[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all auth users (paginated)
    const authUsers: AuthUserLite[] = [];
    let page = 1;
    while (page < 50) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const users = data?.users ?? [];
      for (const u of users) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          app_metadata: u.app_metadata as { provider?: string } | undefined,
        });
      }
      if (users.length < 200) break;
      page++;
    }

    const [
      { data: profiles },
      { data: roles },
      { data: orders },
      { data: wallets },
      { data: reviews },
      { data: tickets },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,display_name,phone,avatar_url,created_at"),
      supabaseAdmin.from("user_roles").select("user_id,role").eq("role", "admin"),
      supabaseAdmin.from("orders").select("user_id,total,status,payment_status,created_at"),
      supabaseAdmin.from("wallets").select("user_id,balance"),
      supabaseAdmin.from("product_reviews").select("user_id"),
      supabaseAdmin.from("support_tickets").select("user_id,status"),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));
    const walletMap = new Map((wallets ?? []).map((w) => [w.user_id, Number(w.balance) || 0]));

    const orderAgg = new Map<string, { count: number; paid: number; spent: number; last: string | null }>();
    for (const o of orders ?? []) {
      const uid = o.user_id as string | null;
      if (!uid) continue;
      const cur = orderAgg.get(uid) ?? { count: 0, paid: 0, spent: 0, last: null };
      cur.count++;
      const isPaid = o.payment_status === "paid" || o.status === "delivered" || o.status === "completed";
      if (isPaid) {
        cur.paid++;
        cur.spent += Number(o.total) || 0;
      }
      if (!cur.last || (o.created_at && o.created_at > cur.last)) cur.last = o.created_at as string;
      orderAgg.set(uid, cur);
    }

    const reviewCount = new Map<string, number>();
    for (const r of reviews ?? []) {
      const uid = r.user_id as string | null;
      if (!uid) continue;
      reviewCount.set(uid, (reviewCount.get(uid) ?? 0) + 1);
    }

    const ticketOpen = new Map<string, number>();
    for (const t of tickets ?? []) {
      const uid = t.user_id as string | null;
      if (!uid) continue;
      if (t.status === "open" || t.status === "pending") {
        ticketOpen.set(uid, (ticketOpen.get(uid) ?? 0) + 1);
      }
    }

    const result: CustomerDetail[] = authUsers.map((u) => {
      const p = profileMap.get(u.id);
      const agg = orderAgg.get(u.id);
      return {
        id: u.id,
        email: u.email,
        email_confirmed: !!u.email_confirmed_at,
        display_name: p?.display_name ?? null,
        phone: p?.phone ?? null,
        avatar_url: p?.avatar_url ?? null,
        created_at: p?.created_at ?? new Date().toISOString(),
        last_sign_in_at: u.last_sign_in_at,
        is_admin: adminSet.has(u.id),
        provider: u.app_metadata?.provider ?? null,
        orders_count: agg?.count ?? 0,
        orders_paid: agg?.paid ?? 0,
        total_spent: agg?.spent ?? 0,
        last_order_at: agg?.last ?? null,
        wallet_balance: walletMap.get(u.id) ?? 0,
        reviews_count: reviewCount.get(u.id) ?? 0,
        tickets_open: ticketOpen.get(u.id) ?? 0,
      };
    });

    result.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    return result;
  });
