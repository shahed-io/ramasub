import { createFileRoute, redirect } from "@tanstack/react-router";

// bKash redirects the customer here after payment. We execute the payment
// server-side, mark the order, and bounce the customer back to the app.
export const Route = createFileRoute("/api/public/bkash/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const paymentID = url.searchParams.get("paymentID");
        const status = url.searchParams.get("status"); // success | failure | cancel
        const orderId = url.searchParams.get("orderId");
        const origin = url.origin;

        if (!paymentID || !orderId || typeof paymentID !== "string" || typeof orderId !== "string" || orderId.length < 10) {
          throw redirect({ to: "/orders", search: { error: "invalid_callback" } as any });
        }

        if (status !== "success") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", orderId);
          return Response.redirect(`${origin}/orders/${orderId}?bkash=${status || "failed"}`, 302);
        }

        try {
          const { bkashExecutePayment } = await import("@/lib/bkash.server");
          const exec = await bkashExecutePayment(paymentID);
          let ok = exec?.transactionStatus === "Completed" && exec?.statusCode === "0000";

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (ok) {
            // Security binding: the executed payment must reference THIS order.
            // We set merchantInvoiceNumber to order.id.slice(0,8).toUpperCase()
            // during createPayment; reject anything else to prevent cross-order
            // payment replay.
            const expectedInvoice = orderId.slice(0, 8).toUpperCase();
            const gotInvoice = String(
              exec?.merchantInvoiceNumber || exec?.payerReference || "",
            ).toUpperCase();
            if (gotInvoice && gotInvoice !== expectedInvoice) ok = false;

            // Amount binding: the paid amount must equal the order total.
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("total")
              .eq("id", orderId)
              .maybeSingle();
            const paidAmount = Number(exec?.amount ?? NaN);
            const total = Number(order?.total ?? NaN);
            if (Number.isFinite(paidAmount) && Number.isFinite(total)) {
              if (Math.abs(paidAmount - total) > 0.5) ok = false;
            }
          }

          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: ok ? "verified" : "failed",
              transaction_id: exec?.trxID || paymentID,
              payment_method: "bKash",
            })
            .eq("id", orderId);

          return Response.redirect(`${origin}/orders/${orderId}?bkash=${ok ? "success" : "failed"}`, 302);
        } catch (e) {
          return Response.redirect(`${origin}/orders/${orderId}?bkash=error`, 302);
        }
      },
    },
  },
});
