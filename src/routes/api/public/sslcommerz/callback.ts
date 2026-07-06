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

  if (!orderId) {
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
  const status = (params.status || "").toUpperCase();

  try {
    let verifiedOk = status === "VALID" || status === "VALIDATED";
    let trxId = params.tran_id || params.bank_tran_id;

    if (val_id) {
      const { sslczValidate } = await import("@/lib/sslcommerz.server");
      const v = await sslczValidate(val_id);
      const s = String(v?.status || "").toUpperCase();
      verifiedOk = s === "VALID" || s === "VALIDATED";
      trxId = v?.tran_id || v?.bank_tran_id || trxId;
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
