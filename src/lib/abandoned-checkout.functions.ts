import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { formatIssues } from "@/lib/validation";
import type { Database } from "@/integrations/supabase/types";

const itemSchema = z.object({
  slug: z.string().max(200).optional().nullable(),
  name: z.string().max(300).optional().nullable(),
  planPeriod: z.union([z.string(), z.number()]).transform(v => String(v)).optional().nullable(),
  qty: z.number().int().min(1).max(999).optional().nullable(),
  price: z.number().min(0).max(1_000_000).optional().nullable(),
  emoji: z.string().max(16).optional().nullable(),
}).passthrough();

const inputSchema = z.object({
  email: z.string().trim().email().max(255),
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
  .inputValidator((d: unknown) => {
    const res = inputSchema.safeParse(d as any);
    if (!res.success) throw new Error(formatIssues(res.error));
    return res.data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    let userId: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (token && url && key) {
        try {
          const supabase = createClient<Database>(url, key, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData } = await supabase.auth.getClaims(token);
          userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
        } catch {
          userId = null;
        }
      }
    }

    const email = data.email.toLowerCase().trim();
    const phone = (data.phone ?? "").trim();
    const fullName = (data.full_name ?? "").trim() || email.split("@")[0] || "Checkout Visitor";

    const payload = {
      user_id: userId,
      full_name: fullName,
      email,
      phone,
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

    let existing: { id: string; status: string | null } | null = null;
    if (userId) {
      const { data: byUser } = await supabaseAdmin
        .from("abandoned_checkouts")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle();
      existing = byUser;
    }
    if (!existing) {
      const { data: byEmail } = await supabaseAdmin
        .from("abandoned_checkouts")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();
      existing = byEmail;
    }

    if (existing?.id) {
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
    if (error?.code === "23505") {
      const { data: recovered, error: updateError } = await supabaseAdmin
        .from("abandoned_checkouts")
        .update(payload)
        .eq("email", email)
        .select("id")
        .single();
      if (updateError) return { ok: false as const, error: updateError.message };
      return { ok: true as const, id: recovered.id, updated: true };
    }
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: (inserted as any).id, updated: false };
  });

export const listAbandonedCheckouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { data, error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });

export const updateAbandonedCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const res = z.object({ id: z.string().uuid(), patch: z.record(z.unknown()) }).safeParse(d as any);
    if (!res.success) throw new Error(formatIssues(res.error));
    return res.data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .update(data.patch as any)
      .eq("id", data.id);

    if (error) throw error;
    return { ok: true };
  });

export const deleteAbandonedCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const res = z.object({ id: z.string().uuid() }).safeParse(d as any);
    if (!res.success) throw new Error(formatIssues(res.error));
    return res.data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");

    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    await assertAdminMfaGrant(context.userId);

    const { error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { ok: true };
  });
