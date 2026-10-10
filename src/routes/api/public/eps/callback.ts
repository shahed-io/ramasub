import { createFileRoute, redirect } from "@tanstack/react-router";

// EPS redirects the customer here after payment. We verify server-side, mark
// the order, and bounce the customer back to the app.
export const Route = createFileRoute("/api/public/eps/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const origin = url.origin;

  // EPS may POST form data or GET query params depending on integration mode.
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

  const transactionId =
    params.transaction_id || params.tran_id || params.txnid || params.session_id;
  const status = (params.status || params.pay_status || "").toLowerCase();

  if (!orderId || typeof orderId !== "string" || orderId.length < 10) {
    throw redirect({ to: "/orders", search: { error: "invalid_callback" } as any });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const isCancelled = status === "cancel" || status === "cancelled";
  const isFailed = status === "fail" || status === "failed" || status === "error";

  if (isCancelled || isFailed) {
    // Unverified status from the request: do not modify the order.
    return Response.redirect(
      `${origin}/orders/${orderId}?eps=${isCancelled ? "cancelled" : "failed"}`,
      302,
    );
  }

  // Security: never trust client-supplied `status`. A successful verification
  // REQUIRES a real transaction id that we can validate with EPS.
  if (!transactionId) {
    return Response.redirect(`${origin}/orders/${orderId}?eps=failed`, 302);
  }

  try {
    const { epsVerifyPayment } = await import("@/lib/eps.server");
    const v = await epsVerifyPayment(transactionId);
    const vStatus = String(
      v?.status || v?.payment_status || v?.data?.status || "",
    ).toLowerCase();
    let verifiedOk =
      vStatus === "success" ||
      vStatus === "completed" ||
      vStatus === "valid" ||
      v?.verified === true;
    const trxId = v?.transaction_id || v?.data?.transaction_id || transactionId;

    // Amount check: gateway-reported paid amount must match order total.
    if (verifiedOk) {
      const paidAmount = Number(
        v?.amount ?? v?.paid_amount ?? v?.data?.amount ?? v?.data?.paid_amount ?? NaN,
      );
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .maybeSingle();
      const total = Number(order?.total ?? NaN);
      if (Number.isFinite(paidAmount) && Number.isFinite(total)) {
        if (Math.abs(paidAmount - total) > 0.5) verifiedOk = false;
      }
      // Invoice binding: reject if response's invoice/orderId doesn't match this order
      const invoice = String(
        v?.invoice || v?.merchant_invoice || v?.data?.invoice || "",
      ).toUpperCase();
      const expected = orderId.slice(0, 8).toUpperCase();
      if (invoice && invoice !== expected) verifiedOk = false;
    }

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: verifiedOk ? "verified" : "failed",
        transaction_id: trxId || undefined,
        payment_method: "EPS",
      })
      .eq("id", orderId);

    return Response.redirect(
      `${origin}/orders/${orderId}?eps=${verifiedOk ? "success" : "failed"}`,
      302,
    );
  } catch {
    return Response.redirect(`${origin}/orders/${orderId}?eps=error`, 302);
  }
}
