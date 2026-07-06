// Server-only SSLCommerz Payment Gateway helpers.
// Reads credentials from the admin_records table (kind: "sslcommerz_pgw") so
// admins can configure everything manually from /Mahbub214/sslcommerz-pgw.

const SANDBOX_BASE = "https://sandbox.sslcommerz.com";
const LIVE_BASE = "https://securepay.sslcommerz.com";

export type SslczMode = "sandbox" | "live";

export async function getSslczCreds() {
  let store_id: string | undefined;
  let store_password: string | undefined;
  let callback_url: string | undefined;
  let mode: SslczMode = "sandbox";
  let enabled = false;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_records")
      .select("data,is_active")
      .eq("kind", "sslcommerz_pgw")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const d = ((data as any)?.data ?? {}) as Record<string, unknown>;
    store_id = (d.store_id as string) || undefined;
    store_password = (d.store_password as string) || undefined;
    callback_url = (d.callback_url as string) || undefined;
    const env = (d.environment as string) || "sandbox";
    mode = env === "live" ? "live" : "sandbox";
    enabled = Boolean((data as any)?.is_active) && Boolean(d.enabled);
  } catch {
    // fall through to env fallbacks
  }

  store_id ||= process.env.SSLCZ_STORE_ID;
  store_password ||= process.env.SSLCZ_STORE_PASSWORD;
  if (process.env.SSLCZ_MODE === "live" || process.env.SSLCZ_MODE === "sandbox") {
    mode = process.env.SSLCZ_MODE as SslczMode;
  }

  const missing = [
    !store_id && "Store ID",
    !store_password && "Store Password",
  ].filter(Boolean) as string[];

  return { store_id, store_password, callback_url, mode, missing, enabled };
}

export function sslczBase(mode?: SslczMode) {
  const m = mode || "sandbox";
  return m === "live" ? LIVE_BASE : SANDBOX_BASE;
}

/** Verify creds by calling SSLCommerz validator with dummy val_id — a 200
 *  response (even if empty) confirms the endpoint is reachable with creds. */
export async function testSslczCreds(mode?: SslczMode) {
  const c = await getSslczCreds();
  if (c.missing.length) throw new Error(`Missing SSLCommerz credentials: ${c.missing.join(", ")}`);
  const m = mode || c.mode;
  // Init an empty session to check auth; server returns status "FAILED" with
  // "Invalid Amount" for a zero-amount request but confirms creds are valid.
  const body = new URLSearchParams({
    store_id: c.store_id!,
    store_passwd: c.store_password!,
    total_amount: "10",
    currency: "BDT",
    tran_id: `test-${Date.now()}`,
    success_url: "https://example.com/success",
    fail_url: "https://example.com/fail",
    cancel_url: "https://example.com/cancel",
    cus_name: "Test",
    cus_email: "test@example.com",
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: "01700000000",
    product_name: "Test",
    product_category: "Test",
    product_profile: "general",
    shipping_method: "NO",
    num_of_item: "1",
  });
  const res = await fetch(`${sslczBase(m)}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = (await res.json().catch(() => ({}))) as any;
  return {
    ok: j?.status === "SUCCESS",
    status: j?.status,
    failedreason: j?.failedreason,
    sessionkey: j?.sessionkey,
  };
}

export async function sslczCreateSession(payload: {
  amount: string;
  invoice: string;
  successURL: string;
  failURL: string;
  cancelURL: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
}, mode?: SslczMode) {
  const c = await getSslczCreds();
  if (c.missing.length) throw new Error(`Missing SSLCommerz credentials: ${c.missing.join(", ")}`);
  const m = mode || c.mode;
  const body = new URLSearchParams({
    store_id: c.store_id!,
    store_passwd: c.store_password!,
    total_amount: payload.amount,
    currency: "BDT",
    tran_id: payload.invoice,
    success_url: payload.successURL,
    fail_url: payload.failURL,
    cancel_url: payload.cancelURL,
    cus_name: payload.customerName || "Customer",
    cus_email: payload.customerEmail || "noreply@ramasub.com",
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: payload.customerPhone || "01700000000",
    product_name: payload.productName || "Order",
    product_category: "Digital",
    product_profile: "general",
    shipping_method: "NO",
    num_of_item: "1",
  });
  const res = await fetch(`${sslczBase(m)}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await res.json().catch(() => ({}))) as any;
}

export async function sslczValidate(val_id: string, mode?: SslczMode) {
  const c = await getSslczCreds();
  const m = mode || c.mode;
  const url = new URL(`${sslczBase(m)}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", val_id);
  url.searchParams.set("store_id", c.store_id || "");
  url.searchParams.set("store_passwd", c.store_password || "");
  url.searchParams.set("format", "json");
  const res = await fetch(url.toString());
  return (await res.json().catch(() => ({}))) as any;
}
