import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SECURITY: Server-authoritative order creation.
// Client-supplied prices are IGNORED. Every line item's price is recomputed
// from the current products.plans row on the server. Coupon discounts are
// re-derived via the validate_coupon RPC. This is the ONLY sanctioned path
// to create an order — direct client INSERTs into public.orders are blocked
// by RLS (see migration 20260707_secure_orders_insert.sql).

const itemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  planPeriod: z.string().trim().min(1).max(120),
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateOrderInput) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // 1. Fetch every referenced product in one query.
    const slugs = Array.from(new Set(data.items.map((i) => i.slug)));
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
      })
      .select("id")
      .single();
    if (iErr) throw new Error(`Failed to create order: ${iErr.message}`);

    return {
      id: inserted.id as string,
      subtotal,
      discount,
      total,
      items: richItems,
    };
  });
