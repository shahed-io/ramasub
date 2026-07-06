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

/** Admin: returns which SSLCommerz secrets are set and the current mode. */
export const getSslczStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getSslczCreds } = await import("@/lib/sslcommerz.server");
    const c = await getSslczCreds();
    return {
      mode: c.mode,
      has: {
        store_id: !!c.store_id,
        store_password: !!c.store_password,
      },
      missing: c.missing,
      ready: c.missing.length === 0,
      enabled: c.enabled,
    };
  });

/** Admin: verifies credentials by initiating a probe session. */
export const testSslczConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ mode: z.enum(["sandbox", "live"]).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { testSslczCreds } = await import("@/lib/sslcommerz.server");
    try {
      const r = await testSslczCreds(data.mode);
      return { ok: r.ok, status: r.status, error: r.failedreason };
    } catch (e: any) {
      return { ok: false, error: e?.message || "unknown error" };
    }
  });

/** User: create an SSLCommerz session and return the GatewayPageURL. */
export const createSslczPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,user_id,total,full_name,email,phone")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) throw new Error("Order not found");
    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid order total");

    const { sslczCreateSession } = await import("@/lib/sslcommerz.server");
    const origin = process.env.SITE_URL || "https://ramasub.com";
    const cbBase = `${origin}/api/public/sslcommerz/callback?orderId=${order.id}`;
    // SECURITY: authoritative server-side total, never trust a client amount.
    const res = await sslczCreateSession({
      amount: total.toFixed(2),
      invoice: `ANB${order.id.slice(0, 8).toUpperCase()}${Date.now().toString().slice(-4)}`,
      successURL: `${cbBase}&result=success`,
      failURL: `${cbBase}&result=fail`,
      cancelURL: `${cbBase}&result=cancel`,
      customerName: order.full_name || undefined,
      customerEmail: order.email || undefined,
      customerPhone: order.phone || undefined,
      productName: `Order ${order.id.slice(0, 8).toUpperCase()}`,
    });
    const redirectURL: string | undefined = res?.GatewayPageURL || res?.redirectGatewayURL;
    if (res?.status !== "SUCCESS" || !redirectURL) {
      throw new Error(res?.failedreason || "SSLCommerz session create failed");
    }
    return { redirectURL, sessionKey: res?.sessionkey };
  });

