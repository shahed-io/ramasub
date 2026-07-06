import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

/** Admin: returns which bKash secrets are set and the current mode. */
export const getBkashStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getBkashCreds } = await import("@/lib/bkash.server");
    const c = await getBkashCreds();
    return {
      mode: c.mode,
      has: {
        app_key: !!c.app_key,
        app_secret: !!c.app_secret,
        username: !!c.username,
        password: !!c.password,
      },
      missing: c.missing,
      ready: c.missing.length === 0,
    };
  });

/** Admin: performs a live grant-token call against bKash to verify credentials. */
export const testBkashConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: z.enum(["sandbox", "live"]).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getBkashToken } = await import("@/lib/bkash.server");
    try {
      const token = await getBkashToken(data.mode);
      return { ok: true, tokenPreview: token.slice(0, 12) + "…" };
    } catch (e: any) {
      return { ok: false, error: e?.message || "unknown error" };
    }
  });

/** User: create a bKash payment for a pending order and return the bKashURL to redirect to. */
export const createBkashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify the order belongs to the caller
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,user_id,total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) throw new Error("Order not found");
    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid order total");

    const { bkashCreatePayment } = await import("@/lib/bkash.server");
    const origin = new URL(
      (globalThis as any).location?.href || process.env.SITE_URL || "https://ramasub.com",
    ).origin;
    const callbackURL = `${origin}/api/public/bkash/callback?orderId=${order.id}`;
    // SECURITY: use the authoritative server-side total, never a client amount.
    const res = await bkashCreatePayment({
      amount: total.toFixed(2),
      invoice: order.id.slice(0, 8).toUpperCase(),
      callbackURL,
      merchantAssociationInfo: `order:${order.id}`,
    });
    if (!res?.bkashURL || !res?.paymentID) {
      throw new Error(res?.statusMessage || res?.errorMessage || "bKash create failed");
    }
    return { bkashURL: res.bkashURL, paymentID: res.paymentID };
  });

