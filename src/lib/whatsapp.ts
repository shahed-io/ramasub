// WhatsApp direct-order helper.
// Number is configurable via admin_records (kind='shop_config') but we keep
// a safe default so the app works even before the config row is fetched.

export const DEFAULT_SHOP_WA = "8801580607614";

export type WaOrderItem = {
  name: string;
  planPeriod: string;
  qty: number;
  price: number;
};

export type WaCustomer = {
  name?: string;
  phone?: string;
  email?: string;
};

function fmtBdt(n: number) {
  return `৳${n.toLocaleString("en-BD")}`;
}

/** Build a wa.me URL with a pre-filled order message. */
export function waOrderUrl(
  items: WaOrderItem[],
  opts: { number?: string; customer?: WaCustomer; note?: string } = {},
) {
  const num = (opts.number || DEFAULT_SHOP_WA).replace(/[^\d]/g, "");
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);

  const lines: string[] = [];
  lines.push("🛒 *AccessNow BD — New Order*", "");
  if (items.length) {
    lines.push("*Items:*");
    items.forEach((it, i) => {
      lines.push(
        `${i + 1}. ${it.name} — ${it.planPeriod} × ${it.qty} = ${fmtBdt(it.price * it.qty)}`,
      );
    });
    lines.push("", `*Total: ${fmtBdt(total)}*`);
  }
  if (opts.customer?.name || opts.customer?.phone || opts.customer?.email) {
    lines.push("", "*Customer:*");
    if (opts.customer.name) lines.push(`Name: ${opts.customer.name}`);
    if (opts.customer.phone) lines.push(`Phone: ${opts.customer.phone}`);
    if (opts.customer.email) lines.push(`Email: ${opts.customer.email}`);
  }
  if (opts.note) lines.push("", `*Note:* ${opts.note}`);
  lines.push("", "Please confirm availability and payment instructions. Thanks!");

  return `https://wa.me/${num}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Quick "ask about this product" link with no order details. */
export function waAskUrl(productName: string, opts: { number?: string } = {}) {
  const num = (opts.number || DEFAULT_SHOP_WA).replace(/[^\d]/g, "");
  const text = `Hi! I'd like to order *${productName}*. Could you share details?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
