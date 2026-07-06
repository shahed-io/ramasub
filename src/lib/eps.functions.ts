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

/** Admin: returns which EPS secrets are set and the current mode. */
export const getEpsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getEpsCreds } = await import("@/lib/eps.server");
    const c = await getEpsCreds();
    return {
      mode: c.mode,
      has: {
        merchant_id: !!c.merchant_id,
        store_id: !!c.store_id,
        store_password: !!c.store_password,
        api_key: !!c.api_key,
      },
      missing: c.missing,
      ready: c.missing.length === 0,
    };
  });

/** Admin: performs a live auth-token call against EPS to verify credentials. */
export const testEpsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ mode: z.enum(["sandbox", "live"]).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getEpsToken } = await import("@/lib/eps.server");
    try {
      const token = await getEpsToken(data.mode);
      return { ok: true, tokenPreview: token.slice(0, 12) + "…" };
    } catch (e: any) {
      return { ok: false, error: e?.message || "unknown error" };
    }
  });

/** User: create an EPS payment session and return the redirect URL. */
export const createEpsPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,user_id,total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) throw new Error("Order not found");
    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid order total");

    const { epsCreateSession } = await import("@/lib/eps.server");
    const origin = new URL(
      (globalThis as any).location?.href ||
        process.env.SITE_URL ||
        "https://ramasub.com",
    ).origin;
    const callbackURL = `${origin}/api/public/eps/callback?orderId=${order.id}`;
    // SECURITY: authoritative server-side total, never trust a client amount.
    const res = await epsCreateSession({
      amount: total.toFixed(2),
      invoice: order.id.slice(0, 8).toUpperCase(),
      callbackURL,
      description: `Order ${order.id.slice(0, 8).toUpperCase()}`,
    });
    const redirectURL: string | undefined =
      res?.redirect_url || res?.gateway_url || res?.checkout_url || res?.data?.redirect_url;
    const sessionId: string | undefined =
      res?.session_id || res?.transaction_id || res?.data?.session_id;
    if (!redirectURL) {
      throw new Error(res?.message || res?.error || "EPS session create failed");
    }
    return { redirectURL, sessionId };
  });

