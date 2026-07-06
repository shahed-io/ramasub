// Server-only bKash Tokenized Checkout helpers.
// Reads credentials from the admin_records table (kind: "bkash_pgw") so admins
// can configure everything manually from /Mahbub214/bkash-pgw — no secret
// forms or redirects required. Falls back to env vars if the row is absent.

const SANDBOX_BASE = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const LIVE_BASE = "https://tokenized.pay.bka.sh/v1.2.0-beta";

export type BkashMode = "sandbox" | "live";

export async function getBkashCreds() {
  let app_key: string | undefined;
  let app_secret: string | undefined;
  let username: string | undefined;
  let password: string | undefined;
  let merchant_number: string | undefined;
  let callback_url: string | undefined;
  let mode: BkashMode = "sandbox";
  let enabled = false;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_records")
      .select("data,is_active")
      .eq("kind", "bkash_pgw")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const d = ((data as any)?.data ?? {}) as Record<string, unknown>;
    app_key = (d.app_key as string) || undefined;
    app_secret = (d.app_secret as string) || undefined;
    username = (d.username as string) || undefined;
    password = (d.password as string) || undefined;
    merchant_number = (d.merchant_number as string) || undefined;
    callback_url = (d.callback_url as string) || undefined;
    const env = (d.environment as string) || "sandbox";
    mode = env === "live" ? "live" : "sandbox";
    enabled = Boolean((data as any)?.is_active) && Boolean(d.enabled);
  } catch {
    // fall through to env fallbacks
  }

  app_key ||= process.env.BKASH_APP_KEY;
  app_secret ||= process.env.BKASH_APP_SECRET;
  username ||= process.env.BKASH_USERNAME;
  password ||= process.env.BKASH_PASSWORD;
  if (process.env.BKASH_MODE === "live" || process.env.BKASH_MODE === "sandbox") {
    mode = process.env.BKASH_MODE as BkashMode;
  }

  const missing = [
    !app_key && "App Key",
    !app_secret && "App Secret",
    !username && "Username",
    !password && "Password",
  ].filter(Boolean) as string[];

  return { app_key, app_secret, username, password, merchant_number, callback_url, mode, missing, enabled };
}

export function bkashBase(mode?: BkashMode) {
  const m = mode || "sandbox";
  return m === "live" ? LIVE_BASE : SANDBOX_BASE;
}

// In-memory token cache (worker-scoped)
let cached: { token: string; exp: number; key: string } | null = null;

export async function getBkashToken(mode?: BkashMode): Promise<string> {
  const creds = await getBkashCreds();
  const m = mode || creds.mode;
  const cacheKey = `${m}:${creds.username}`;
  if (cached && cached.key === cacheKey && cached.exp - 30_000 > Date.now()) return cached.token;
  if (creds.missing.length) throw new Error(`Missing bKash credentials: ${creds.missing.join(", ")}`);

  const res = await fetch(`${bkashBase(m)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: creds.username!,
      password: creds.password!,
    },
    body: JSON.stringify({ app_key: creds.app_key, app_secret: creds.app_secret }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !j?.id_token) {
    throw new Error(j?.statusMessage || j?.errorMessage || `bKash token failed (${res.status})`);
  }
  cached = {
    token: j.id_token,
    exp: Date.now() + Math.min(Number(j.expires_in || 3600), 3600) * 1000,
    key: cacheKey,
  };
  return cached.token;
}

async function bkashCall(path: string, body: any, mode?: BkashMode) {
  const creds = await getBkashCreds();
  const m = mode || creds.mode;
  const token = await getBkashToken(m);
  const res = await fetch(`${bkashBase(m)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": creds.app_key!,
    },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as any;
}

export function bkashCreatePayment(payload: {
  amount: string;
  invoice: string;
  callbackURL: string;
  merchantAssociationInfo?: string;
}, mode?: BkashMode) {
  return bkashCall("/tokenized/checkout/create", {
    mode: "0011",
    payerReference: " ",
    callbackURL: payload.callbackURL,
    amount: payload.amount,
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: payload.invoice,
    merchantAssociationInfo: payload.merchantAssociationInfo,
  }, mode);
}

export function bkashExecutePayment(paymentID: string, mode?: BkashMode) {
  return bkashCall("/tokenized/checkout/execute", { paymentID }, mode);
}

export function bkashQueryPayment(paymentID: string, mode?: BkashMode) {
  return bkashCall("/tokenized/checkout/payment/status", { paymentID }, mode);
}
