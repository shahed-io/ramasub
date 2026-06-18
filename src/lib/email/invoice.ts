import { sendTransactionalEmail } from "./send";

interface InvoiceOrderItem {
  name?: string;
  slug?: string;
  qty: number;
  price?: number;
  planPeriod?: string;
}

export interface InvoiceOrderLike {
  id: string;
  full_name: string;
  email: string;
  payment_method: string;
  transaction_id?: string | null;
  items: InvoiceOrderItem[];
  total: number;
  created_at: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtAmount = (n: number) => n.toLocaleString("en-BD");

/**
 * Sends the invoice email for a given order to the order's email address.
 * Uses orderId in the idempotency key so repeated clicks don't duplicate sends.
 */
export async function sendInvoiceEmail(order: InvoiceOrderLike) {
  const items = (order.items ?? []).map((it) => ({
    name: it.name || it.slug || "Subscription",
    qty: it.qty,
    price: fmtAmount((it.price ?? 0) * it.qty),
  }));
  const subtotal = order.items.reduce(
    (s, it) => s + (it.price ?? 0) * it.qty,
    0,
  );
  const discount = Math.max(0, subtotal - order.total);
  const orderShort = order.id.slice(0, 8).toUpperCase();

  return sendTransactionalEmail({
    templateName: "invoice",
    recipientEmail: order.email,
    idempotencyKey: `invoice-${order.id}`,
    templateData: {
      name: order.full_name?.split(" ")[0],
      orderId: `ANB-${orderShort}`,
      invoiceDate: fmtDate(order.created_at),
      paymentMethod: order.transaction_id
        ? `${order.payment_method} (${order.transaction_id})`
        : order.payment_method,
      items,
      subtotal: fmtAmount(subtotal),
      discount: fmtAmount(discount),
      total: fmtAmount(order.total),
      invoiceUrl: `${typeof window !== "undefined" ? window.location.origin : "https://accessnowbd.com"}/orders/${order.id}`,
    },
  });
}
