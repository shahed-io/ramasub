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
  email: z.string().email().optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  items: z.array(itemSchema),
  status: z.string().optional(),
  total: z.number().min(0).max(10_000_000).optional(),
  coupon_code: z.string().trim().max(80).nullable().optional(),
});

export type CaptureAbandonedInput = z.infer<typeof inputSchema>;

export const captureAbandonedCheckout = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const isServiceRole = authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || "NEVER_MATCH");

    let userId = data.user_id;

    if (!userId && !isServiceRole) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId && !data.email) {
      return { ok: false, message: "No identifier provided" };
    }

    const payload = {
      user_id: userId || null,
      email: data.email ?? "",
      full_name: data.full_name ?? "",
      phone: data.phone ?? "",
      items: data.items,
      status: data.status || "pending",
      total: data.total || 0,
      coupon_code: data.coupon_code || null,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      const { error } = await supabaseAdmin
        .from("abandoned_checkouts")
        .upsert(payload as any, { onConflict: "user_id" });
      if (error) throw error;
    } else if (data.email) {
      const { error } = await supabaseAdmin
        .from("abandoned_checkouts")
        .upsert(payload as any, { onConflict: "email" });
      if (error) throw error;
    }

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
  .inputValidator((input: any) => {
    return parseOrThrow(z.object({ id: z.string().uuid(), patch: z.record(z.unknown()) }).strict(), input) as any;
  })
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
      .update(data.patch as any)
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
