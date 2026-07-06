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

  if (!orderId) {
    throw redirect({ to: "/orders", search: { error: "invalid_callback" } as any });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const isCancelled = status === "cancel" || status === "cancelled";
  const isFailed = status === "fail" || status === "failed" || status === "error";

  if (isCancelled || isFailed) {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", orderId);
    return Response.redirect(
      `${origin}/orders/${orderId}?eps=${isCancelled ? "cancelled" : "failed"}`,
      302,
    );
  }

  try {
    let verifiedOk = status === "success" || status === "completed" || status === "valid";
    let trxId = transactionId;

    if (transactionId) {
      const { epsVerifyPayment } = await import("@/lib/eps.server");
      const v = await epsVerifyPayment(transactionId);
      const vStatus = String(
        v?.status || v?.payment_status || v?.data?.status || "",
      ).toLowerCase();
      verifiedOk =
        vStatus === "success" ||
        vStatus === "completed" ||
        vStatus === "valid" ||
        v?.verified === true;
      trxId = v?.transaction_id || v?.data?.transaction_id || transactionId;
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
