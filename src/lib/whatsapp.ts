// WhatsApp direct-order helper.
// Number is configurable via admin_records (kind='shop_config') but we keep
// a safe default so the app works even before the config row is fetched.

export const DEFAULT_SHOP_WA = "8801601048085";

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
  lines.push("আসসালামু আলাইকুম, Rama Sub 👋", "");
  lines.push("আমি নিচের সাবস্ক্রিপশন(গুলো) নিতে চাচ্ছি —", "");
  if (items.length) {
    lines.push("🛍️ *আমার অর্ডার:*");
    items.forEach((it, i) => {
      lines.push(
        `${i + 1}. ${it.name} — ${it.planPeriod} × ${it.qty} = ${fmtBdt(it.price * it.qty)}`,
      );
    });
    lines.push("", `💵 *মোট: ${fmtBdt(total)}*`);
  }
  if (opts.customer?.name || opts.customer?.phone || opts.customer?.email) {
    lines.push("", "👤 *আমার তথ্য:*");
    if (opts.customer.name) lines.push(`নাম: ${opts.customer.name}`);
    if (opts.customer.phone) lines.push(`ফোন: ${opts.customer.phone}`);
    if (opts.customer.email) lines.push(`ইমেইল: ${opts.customer.email}`);
  }
  if (opts.note) lines.push("", `📝 *নোট:* ${opts.note}`);
  lines.push(
    "",
    "দয়া করে পেমেন্ট ইনস্ট্রাকশন ও ডেলিভারি কনফার্ম করবেন। ধন্যবাদ! 🙏",
  );

  return `https://wa.me/${num}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Quick "ask about this product" link with no order details. */
export function waAskUrl(productName: string, opts: { number?: string } = {}) {
  const num = (opts.number || DEFAULT_SHOP_WA).replace(/[^\d]/g, "");
  const text =
    `আসসালামু আলাইকুম, Rama Sub 👋\n\n` +
    `আমি *${productName}* সাবস্ক্রিপশনটি নিতে চাচ্ছি।\n` +
    `দয়া করে দাম, প্ল্যান ও ডেলিভারির বিস্তারিত জানাবেন। ধন্যবাদ! 🙏`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
