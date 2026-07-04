import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  slug: z.string().max(200).optional().nullable(),
  name: z.string().max(300).optional().nullable(),
  planPeriod: z.string().max(80).optional().nullable(),
  qty: z.number().int().min(1).max(999).optional().nullable(),
  price: z.number().min(0).max(1_000_000).optional().nullable(),
  emoji: z.string().max(16).optional().nullable(),
}).passthrough();

const inputSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40),
  sender_number: z.string().trim().max(40).nullable().optional(),
  transaction_id: z.string().trim().max(120).nullable().optional(),
  payment_method: z.string().trim().max(80).nullable().optional(),
  payment_screenshot_url: z.string().trim().max(500).nullable().optional(),
  customer_note: z.string().trim().max(1000).nullable().optional(),
  checkout_step: z.number().int().min(1).max(2).optional(),
  items: z.array(itemSchema).min(1).max(50),
  subtotal: z.number().min(0).max(10_000_000),
  total: z.number().min(0).max(10_000_000),
  coupon_code: z.string().trim().max(80).nullable().optional(),
});

export type CaptureAbandonedInput = z.infer<typeof inputSchema>;

export const captureAbandonedCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: CaptureAbandonedInput) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const payload = {
      user_id: data.user_id ?? null,
      full_name: data.full_name,
      email,
      phone: data.phone,
      sender_number: data.sender_number ?? null,
      transaction_id: data.transaction_id ?? null,
      payment_method: data.payment_method ?? null,
      payment_screenshot_url: data.payment_screenshot_url ?? null,
      customer_note: data.customer_note ?? null,
      checkout_step: data.checkout_step ?? 1,
      items: JSON.parse(JSON.stringify(data.items)),
      subtotal: data.subtotal,
      total: data.total,
      coupon_code: data.coupon_code ?? null,
      status: "pending" as const,
      updated_at: new Date().toISOString(),
    };

    // Find existing row: prefer user_id match, then email (case-insensitive).
    let existingId: string | null = null;
    if (data.user_id) {
      const { data: byUser } = await supabaseAdmin
        .from("abandoned_checkouts")
        .select("id, status")
        .eq("user_id", data.user_id)
        .maybeSingle();
      if (byUser?.id && byUser.status !== "recovered") existingId = byUser.id;
    }
    if (!existingId) {
      const { data: byEmail } = await supabaseAdmin
        .from("abandoned_checkouts")
        .select("id, status")
        .ilike("email", email)
        .maybeSingle();
      if (byEmail?.id && byEmail.status !== "recovered") existingId = byEmail.id;
    }

    if (existingId) {
      const { error } = await supabaseAdmin
        .from("abandoned_checkouts")
        .update(payload)
        .eq("id", existingId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: existingId, updated: true };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: inserted.id, updated: false };
  });
