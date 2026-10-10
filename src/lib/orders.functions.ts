import { createServerFn } from "@tanstack/react-start";
import { z, validator } from "@/lib/validation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendMetaPurchaseForOrder } from "@/lib/meta-purchase.server";

// SECURITY: Server-authoritative order creation.
// Client-supplied prices are IGNORED. Every line item's price is recomputed
// from the current products.plans row on the server. Coupon discounts are
// re-derived via the validate_coupon RPC. This is the ONLY sanctioned path
// to create an order — direct client INSERTs into public.orders are blocked
// by RLS (see migration 20260707_secure_orders_insert.sql).

const itemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  planPeriod: z.union([z.string(), z.number()]).transform(v => String(v)).pipe(z.string().trim().min(1).max(120)),
  qty: z.number().int().min(1).max(999),
});

const inputSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  payment_method: z.string().trim().min(1).max(80),
  transaction_id: z.string().trim().max(200).optional().nullable(),
  payment_screenshot_url: z.string().trim().max(1000).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
  coupon_code: z.string().trim().max(80).optional().nullable(),
  use_wallet: z.boolean().optional(),
});

export type CreateOrderInput = z.infer<typeof inputSchema>;

type PlanRow = {
  label?: string | null;
  duration?: string | null;
  price?: number | string | null;
};

function planPriceOf(plans: unknown, planPeriod: string): number | null {
  if (!Array.isArray(plans)) return null;
  const wanted = planPeriod.trim().toLowerCase();
  for (const raw of plans as PlanRow[]) {
    const label = (raw?.label ?? "").toString().trim().toLowerCase();
    const duration = (raw?.duration ?? "").toString().trim().toLowerCase();
    if (label === wanted || duration === wanted) {
      const priceNum = typeof raw.price === "number" ? raw.price : Number(raw?.price);
      if (Number.isFinite(priceNum) && priceNum >= 0) return priceNum;
      return null;
    }
  }
  return null;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(validator(inputSchema))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    let userId: string | null = null;
    try {
      const authHeader = request?.headers?.get("authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        userId = userData?.user?.id ?? null;
      }
    } catch {
      userId = null;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Looser rate-limit check (supports signed-in and guest direct orders)
    {
      const { guardUserAction, retryMessage } = await import("@/lib/rate-limit.server");
      const rl = await guardUserAction("user.order_create", userId || data.phone || data.email, request);
      if (!rl.allowed) throw new Error(retryMessage(rl, true));
    }

    // 1. Fetch every referenced product in one query.
    const slugs = Array.from(new Set(data.items.map((i: any) => i.slug) as string[]));
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("slug,name,emoji,gradient,plans,is_active")
      .in("slug", slugs);
    if (pErr) throw new Error(`Failed to load products: ${pErr.message}`);

    const bySlug = new Map<string, (typeof products)[number]>();
    for (const p of products ?? []) bySlug.set(p.slug as string, p);

    // 2. Recompute each line at server-truth prices.
    let subtotal = 0;
    const richItems: Array<{
      slug: string;
      planPeriod: string;
      qty: number;
      name: string | null;
      emoji: string | null;
      gradient: string | null;
      price: number;
    }> = [];

    for (const it of data.items) {
      const product = bySlug.get(it.slug);
      if (!product) throw new Error(`Product not found: ${it.slug}`);
      if (product.is_active === false) throw new Error(`Product unavailable: ${it.slug}`);
      const unit = planPriceOf(product.plans, it.planPeriod);
      if (unit === null) {
        throw new Error(`Invalid plan '${it.planPeriod}' for product '${it.slug}'`);
      }
      const line = unit * it.qty;
      subtotal += line;
      richItems.push({
        slug: it.slug,
        planPeriod: it.planPeriod,
        qty: it.qty,
        name: (product.name as string | null) ?? null,
        emoji: (product.emoji as string | null) ?? null,
        gradient: (product.gradient as string | null) ?? null,
        price: unit,
      });
    }

    // 3. Re-derive coupon discount server-side.
    let discount = 0;
    if (data.coupon_code) {
      const { data: coupon } = await (supabaseAdmin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Array<{ valid?: boolean; discount?: number | string }> | null }>)(
        "validate_coupon",
        { _code: data.coupon_code, _subtotal: subtotal },
      );
      const row = Array.isArray(coupon) ? coupon[0] : (coupon as { valid?: boolean; discount?: number | string } | null);
      if (row?.valid) {
        const d = Number(row.discount);
        if (Number.isFinite(d) && d > 0) discount = Math.min(d, subtotal);
      }
    }
    const total = Math.max(0, subtotal - discount);

    // 4. Insert authoritative order (admin client bypasses RLS by design).
    const { data: inserted, error: iErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id ?? "",
        payment_screenshot_url: data.payment_screenshot_url ?? null,
        items: richItems,
        total,
        status: "pending",
      } as any)
      .select("id")
      .single();
    if (iErr) throw new Error(`Failed to create order: ${iErr.message}`);

    const publicOrderId = `ANB-${(inserted.id as string).slice(0, 8).toUpperCase()}`;
    // Server-side delivery is authoritative: redirects, ad blockers, or a closed
    // browser can no longer prevent Meta from receiving the Purchase event.
    await sendMetaPurchaseForOrder({
      orderId: publicOrderId,
      value: total,
      currency: "BDT",
      email: data.email,
      phone: data.phone,
      items: richItems.map((item) => ({
        id: item.slug,
        price: item.price,
        quantity: item.qty,
      })),
    });

    return {
      id: inserted.id as string,
      subtotal,
      discount,
      total,
      items: richItems,
    };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });

const adminOrderInput = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().optional(),
  phone: z.string().trim().min(1),
  payment_method: z.string().trim().min(1),
  transaction_id: z.string().trim().optional().nullable(),
  payment_screenshot_url: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    name: z.string(),
    plan: z.string().optional(),
    planPeriod: z.string().optional(),
    price: z.number(),
    qty: z.number().int().min(1).default(1),
    slug: z.string().optional(),
    emoji: z.string().optional(),
  })).min(1),
  total: z.number().min(0),
  status: z.string().default("pending"),
  payment_status: z.string().default("pending"),
  admin_note: z.string().optional().nullable(),
});

export const createAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validator(adminOrderInput))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { data: inserted, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        full_name: data.full_name,
        email: data.email || `${data.phone}@manual.local`,
        phone: data.phone,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id || `MAN-${Date.now()}`,
        payment_screenshot_url: data.payment_screenshot_url || null,
        items: data.items,
        total: data.total,
        status: data.status,
        payment_status: data.payment_status,
        admin_note: data.admin_note || null,
      } as any)
      .select("*")
      .single();

    if (error) throw error;
    return inserted;
  });

export const syncUnlistedOrders = createServerFn({ method: "POST" })
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

    // 1. Fetch existing orders to deduplicate
    const { data: existingOrders } = await supabaseAdmin
      .from("orders")
      .select("id, transaction_id, email, created_at");

    const knownTrx = new Set<string>();
    const knownEmailDates = new Set<string>();
    for (const o of existingOrders ?? []) {
      if (o.transaction_id) knownTrx.add(String(o.transaction_id).trim().toLowerCase());
      if (o.email && o.created_at) {
        knownEmailDates.add(`${String(o.email).toLowerCase()}_${o.created_at.slice(0, 16)}`);
      }
    }

    let syncedCount = 0;

    // 2. Look for unmigrated checkouts in abandoned_checkouts
    const { data: abandonedList } = await supabaseAdmin
      .from("abandoned_checkouts")
      .select("*")
      .order("created_at", { ascending: false });

    for (const ab of abandonedList ?? []) {
      if (ab.recovered_order_id) {
        const orderExists = existingOrders?.some((o) => o.id === ab.recovered_order_id);
        if (orderExists) continue;
      }

      const trx = ab.transaction_id ? String(ab.transaction_id).trim().toLowerCase() : null;
      if (trx && knownTrx.has(trx)) continue;

      const emailKey = ab.email && ab.created_at ? `${String(ab.email).toLowerCase()}_${ab.created_at.slice(0, 16)}` : null;
      if (emailKey && knownEmailDates.has(emailKey)) continue;

      const hasItems = Array.isArray(ab.items) && ab.items.length > 0;
      const hasContact = Boolean(ab.email || ab.phone || ab.full_name);
      const hasPayment = Boolean(ab.transaction_id || ab.sender_number || ab.payment_method);
      if (!hasContact && !hasItems && !hasPayment) continue;

      const finalTrx = ab.transaction_id || (ab.sender_number ? `TRX-${ab.sender_number}` : `SYNC-${ab.id.slice(0, 8).toUpperCase()}`);
      const items = hasItems ? ab.items : [{ name: "Order item", price: Number(ab.total || ab.subtotal || 0), qty: 1 }];

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: ab.user_id || null,
          full_name: ab.full_name || "Customer",
          email: ab.email || (ab.phone ? `${ab.phone}@checkout.local` : "guest@ramasub.com"),
          phone: ab.phone || "",
          payment_method: ab.payment_method || (ab.sender_number ? "bKash" : "manual"),
          transaction_id: finalTrx,
          payment_screenshot_url: ab.payment_screenshot_url || null,
          items,
          total: Number(ab.total || ab.subtotal || 0),
          status: ab.transaction_id ? "processing" : "pending",
          payment_status: ab.transaction_id ? "verified" : "pending",
          admin_note: ab.customer_note ? `Note: ${ab.customer_note}` : `Recovered & synced from checkout (${ab.id})`,
          created_at: ab.created_at || new Date().toISOString(),
        } as any)
        .select("id")
        .single();

      if (!insErr && inserted) {
        syncedCount++;
        if (trx) knownTrx.add(trx);
        await supabaseAdmin
          .from("abandoned_checkouts")
          .update({
            status: "recovered",
            recovered_at: new Date().toISOString(),
            recovered_order_id: inserted.id,
          } as any)
          .eq("id", ab.id);
      }
    }

    // 3. Look for payment link submissions in admin_records
    const { data: submissions } = await supabaseAdmin
      .from("admin_records")
      .select("*")
      .eq("kind", "payment_link_submission")
      .order("created_at", { ascending: false });

    for (const sub of submissions ?? []) {
      const data = sub.data as any;
      if (!data) continue;
      const trx = data.txn_id ? String(data.txn_id).trim().toLowerCase() : null;
      if (trx && knownTrx.has(trx)) continue;

      const emailKey = data.email && sub.created_at ? `${String(data.email).toLowerCase()}_${sub.created_at.slice(0, 16)}` : null;
      if (emailKey && knownEmailDates.has(emailKey)) continue;

      if (!data.full_name && !data.phone && !data.email && !trx) continue;

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("orders")
        .insert({
          full_name: data.full_name || "Payment Link Customer",
          email: data.email || (data.phone ? `${data.phone}@paylink.local` : "paylink@ramasub.com"),
          phone: data.phone || "",
          payment_method: data.payment_method || "Payment Link",
          transaction_id: data.txn_id || `PL-${sub.id.slice(0, 8).toUpperCase()}`,
          items: [{ name: data.link_title || "Payment Link Purchase", price: Number(data.amount || 0), qty: 1 }],
          total: Number(data.amount || 0),
          status: data.status === "verified" ? "completed" : "processing",
          payment_status: data.status === "verified" ? "verified" : "pending",
          admin_note: `Synced from payment link submission (${sub.id})`,
          created_at: sub.created_at || new Date().toISOString(),
        } as any)
        .select("id")
        .single();

      if (!insErr && inserted) {
        syncedCount++;
        if (trx) knownTrx.add(trx);
      }
    }

    return { syncedCount };
  });

export const getOrderById = createServerFn({ method: "GET" })
  .inputValidator((input: any) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return order;
  });

