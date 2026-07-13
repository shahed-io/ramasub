import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FacebookPixel = {
  id: string;
  provider: string;
  label: string | null;
  pixel_id: string | null;
  access_token: string | null;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

async function adminGuard(context: {
  supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listFacebookPixels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FacebookPixel[]> => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tracking_pixels" as never)
      .select("id, provider, label, pixel_id, access_token, enabled, sort_order, notes, created_at, updated_at")
      .eq("provider", "facebook_pixel")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as FacebookPixel[];
  });

export const upsertFacebookPixel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    label?: string;
    pixel_id: string;
    access_token?: string;
    enabled?: boolean;
    sort_order?: number;
    notes?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const pixel_id = (data.pixel_id || "").trim();
    if (!/^\d{6,25}$/.test(pixel_id)) {
      throw new Error("Pixel ID must be 6–25 digits");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: Record<string, unknown> = {
      provider: "facebook_pixel",
      label: data.label?.trim() || null,
      pixel_id,
      enabled: data.enabled ?? true,
      sort_order: data.sort_order ?? 0,
      notes: data.notes?.trim() || null,
    };
    if (typeof data.access_token === "string" && data.access_token.trim().length >= 10) {
      payload.access_token = data.access_token.trim();
    }
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("tracking_pixels" as never)
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("tracking_pixels" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, id: (inserted as { id: string }).id };
    }
  });

export const toggleFacebookPixel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled: boolean }) => input)
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tracking_pixels" as never)
      .update({ enabled: data.enabled } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteFacebookPixel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tracking_pixels" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
