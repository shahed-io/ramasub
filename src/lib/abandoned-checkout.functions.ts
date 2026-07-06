import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  slug: z.string().max(200).optional().nullable(),
  name: z.string().max(300).optional().nullable(),
  planPeriod: z.string().max(80).optional().nullable(),
  qty: z.number().int().min(1).max(999).optional().nullable(),
  price: z.number().min(0).max(1_000_000).optional().nullable(),
  emoji: z.string().max(16).optional().nullable(),
}).passthrough();

// SECURITY: never accept a caller-supplied user_id or email. The identity of
// the record is always the authenticated caller (auth.uid()) — RLS + this
// server function agree, so nobody can attach checkout/payment data to another
// customer's account.
const inputSchema = z.object({
  full_name: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  sender_number: z.string().trim().max(40).nullable().optional(),
  transaction_id: z.string().trim().max(120).nullable().optional(),
  payment_method: z.string().trim().max(80).nullable().optional(),
  payment_screenshot_url: z.string().trim().max(500).nullable().optional(),
  customer_note: z.string().trim().max(1000).nullable().optional(),
  checkout_step: z.number().int().min(1).max(2).optional(),
  items: z.array(itemSchema).max(50).optional(),
  subtotal: z.number().min(0).max(10_000_000).optional(),
  total: z.number().min(0).max(10_000_000).optional(),
  coupon_code: z.string().trim().max(80).nullable().optional(),
});

export type CaptureAbandonedInput = z.infer<typeof inputSchema>;

export const captureAbandonedCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CaptureAbandonedInput) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = (context.claims?.email as string | undefined)?.toLowerCase().trim() || `user-${userId}@pending.local`;
    const phone = (data.phone ?? "").trim();
    const fullName = (data.full_name ?? "").trim() || "Guest Visitor";

    const payload = {
      user_id: userId,
      full_name: fullName,
      email,
      phone: phone || "0000000000",
      sender_number: data.sender_number ?? null,
      transaction_id: data.transaction_id ?? null,
      payment_method: data.payment_method ?? null,
      payment_screenshot_url: data.payment_screenshot_url ?? null,
      customer_note: data.customer_note ?? null,
      checkout_step: data.checkout_step ?? 1,
      items: JSON.parse(JSON.stringify(data.items ?? [])),
      subtotal: data.subtotal ?? 0,
      total: data.total ?? 0,
      coupon_code: data.coupon_code ?? null,
      status: "pending" as const,
      updated_at: new Date().toISOString(),
    };

    // Look up existing pending row for this authenticated user only.
    const { data: existing } = await supabaseAdmin
      .from("abandoned_checkouts")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id && existing.status !== "recovered") {
      const { error } = await supabaseAdmin
        .from("abandoned_checkouts")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: existing.id, updated: true };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: inserted.id, updated: false };
  });
