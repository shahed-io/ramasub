import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z, parseOrThrow, validator } from "@/lib/validation";

const itemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  image_url: z.string().optional(),
  planLabel: z.string().optional(),
});

const inputSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.union([z.string().trim().toLowerCase().email().max(255), z.literal("")]).optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  items: z.array(itemSchema),
  status: z.string().optional(),
  total: z.number().min(0).max(10_000_000).optional(),
  coupon_code: z.string().trim().max(80).nullable().optional(),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  payment_screenshot_url: z.string().optional().nullable(),
});

export type CaptureAbandonedInput = z.infer<typeof inputSchema>;

export const captureAbandonedCheckout = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let userId: string | null = null;
    if (token) {
      try {
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        userId = userData?.user?.id ?? null;
      } catch {}
    }

    const payload = {
      user_id: userId,
      email: data.email ?? "",
      full_name: data.full_name ?? "",
      phone: data.phone ?? "",
      items: data.items,
      status: data.status || "pending",
      total: data.total || 0,
      coupon_code: data.coupon_code || null,
      payment_method: data.payment_method || null,
      transaction_id: data.transaction_id || null,
      payment_screenshot_url: data.payment_screenshot_url || null,
      updated_at: new Date().toISOString(),
    };

    if (!payload.email && !payload.phone) return { ok: false };
    (payload as any).subtotal = data.items.reduce((n, it) => n + it.price * it.quantity, 0);
    (payload as any).checkout_step = data.transaction_id ? 3 : data.payment_method ? 2 : 1;

    // Find the latest still-open row for this visitor (never overwrite recovered history)
    const open = () =>
      supabaseAdmin.from("abandoned_checkouts").select("id")
        .neq("status", "recovered").order("updated_at", { ascending: false }).limit(1);
    let existingId: string | null = null;
    if (userId) {
      // Signed-in visitors only ever touch their own row.
      existingId = (await open().eq("user_id", userId).maybeSingle()).data?.id ?? null;
    } else if (payload.email && payload.phone) {
      // Guests may only refresh a guest row matching BOTH email and phone.
      existingId = (await open().is("user_id", null).ilike("email", payload.email).eq("phone", payload.phone).maybeSingle()).data?.id ?? null;
    }

    const { status: _s, ...updatePayload } = payload;
    const { error } = existingId
      ? await supabaseAdmin.from("abandoned_checkouts").update(updatePayload as any).eq("id", existingId)
      : await supabaseAdmin.from("abandoned_checkouts").insert({ ...payload, status: "pending" } as any);
    if (error) throw error;

    return { ok: true };
  });

export const listAbandonedCheckouts = createServerFn({ method: "GET" })
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
      .from("abandoned_checkouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });

export const updateAbandonedCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => z.object({ id: z.string().uuid(), patch: z.record(z.string(), z.unknown()) }).strict().parse(input) as any)
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

    const { error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .update(Object.fromEntries(
        Object.entries(data.patch as Record<string, unknown>).filter(([k]) =>
          ["status", "admin_note", "contacted_at", "customer_note", "checkout_step"].includes(k),
        ),
      ) as any)
      .eq("id", data.id);

    if (error) throw error;
    return { ok: true };
  });

export const deleteAbandonedCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
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

    const { error } = await supabaseAdmin
      .from("abandoned_checkouts")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { ok: true };
  });
