import { createFileRoute } from "@tanstack/react-router";

// SSLCommerz redirects the customer here after payment. We verify server-side
// with the validator API, mark the order, then bounce back to /orders/:id.
export const Route = createFileRoute("/api/public/sslcommerz/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const orderId = url.searchParams.get("orderId");
  const result = (url.searchParams.get("result") || "").toLowerCase();

  let params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (params[k] = v));
  if (request.method === "POST") {
    try {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = (await request.json()) as any;
        params = { ...params, ...j };
      } else {
        const form = await request.formData();
        form.forEach((v, k) => (params[k] = String(v)));
      }
    } catch {}
  }

  if (!orderId || typeof orderId !== "string" || orderId.length < 10) {
    return Response.redirect(`${origin}/orders?sslcz=invalid`, 302);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (result === "cancel" || result === "fail") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", payment_method: "SSLCommerz" })
      .eq("id", orderId);
    return Response.redirect(`${origin}/orders/${orderId}?sslcz=${result}`, 302);
  }

  const val_id = params.val_id || params.value_a || "";

  // Security: only the SSLCommerz validator API is authoritative. We refuse to
  // mark as paid based on client-provided `status` alone — require val_id.
  if (!val_id) {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", payment_method: "SSLCommerz" })
      .eq("id", orderId);
    return Response.redirect(`${origin}/orders/${orderId}?sslcz=failed`, 302);
  }

  try {
    const { sslczValidate } = await import("@/lib/sslcommerz.server");
    const v = await sslczValidate(val_id);
    const s = String(v?.status || "").toUpperCase();
    let verifiedOk = s === "VALID" || s === "VALIDATED";
    const trxId = v?.tran_id || v?.bank_tran_id || params.tran_id || params.bank_tran_id;

    if (verifiedOk) {
      // Amount binding: the validated amount must match this order's total.
      const paidAmount = Number(v?.amount ?? v?.store_amount ?? NaN);
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .maybeSingle();
      const total = Number(order?.total ?? NaN);
      if (Number.isFinite(paidAmount) && Number.isFinite(total)) {
        if (Math.abs(paidAmount - total) > 0.5) verifiedOk = false;
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: verifiedOk ? "verified" : "failed",
        transaction_id: trxId || undefined,
        payment_method: "SSLCommerz",
      })
      .eq("id", orderId);

    return Response.redirect(
      `${origin}/orders/${orderId}?sslcz=${verifiedOk ? "success" : "failed"}`,
      302,
    );
  } catch {
    return Response.redirect(`${origin}/orders/${orderId}?sslcz=error`, 302);
  }
}
