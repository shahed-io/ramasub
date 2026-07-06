// Server-only bKash Tokenized Checkout helpers.
// Never import from client-reachable files at module scope.

const SANDBOX_BASE = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const LIVE_BASE = "https://tokenized.pay.bka.sh/v1.2.0-beta";

export type BkashMode = "sandbox" | "live";

export function getBkashCreds() {
  const app_key = process.env.BKASH_APP_KEY;
  const app_secret = process.env.BKASH_APP_SECRET;
  const username = process.env.BKASH_USERNAME;
  const password = process.env.BKASH_PASSWORD;
  const mode = (process.env.BKASH_MODE as BkashMode) || "sandbox";
  const missing = [
    !app_key && "BKASH_APP_KEY",
    !app_secret && "BKASH_APP_SECRET",
    !username && "BKASH_USERNAME",
    !password && "BKASH_PASSWORD",
  ].filter(Boolean) as string[];
  return { app_key, app_secret, username, password, mode, missing };
}

export function bkashBase(mode?: BkashMode) {
  const m = mode || (process.env.BKASH_MODE as BkashMode) || "sandbox";
  return m === "live" ? LIVE_BASE : SANDBOX_BASE;
}

// In-memory token cache (worker-scoped; refreshed after expiry).
let cached: { token: string; exp: number } | null = null;

export async function getBkashToken(mode?: BkashMode): Promise<string> {
  if (cached && cached.exp - 30_000 > Date.now()) return cached.token;
  const { app_key, app_secret, username, password, missing } = getBkashCreds();
  if (missing.length) throw new Error(`Missing bKash secrets: ${missing.join(", ")}`);

  const res = await fetch(`${bkashBase(mode)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: username!,
      password: password!,
    },
    body: JSON.stringify({ app_key, app_secret }),
  });
  const j = (await res.json()) as any;
  if (!res.ok || !j?.id_token) {
    throw new Error(j?.statusMessage || j?.errorMessage || `bKash token failed (${res.status})`);
  }
  cached = {
    token: j.id_token,
    exp: Date.now() + Math.min(Number(j.expires_in || 3600), 3600) * 1000,
  };
  return cached.token;
}

async function bkashCall(path: string, body: any, mode?: BkashMode) {
  const token = await getBkashToken(mode);
  const { app_key } = getBkashCreds();
  const res = await fetch(`${bkashBase(mode)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": app_key!,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as any;
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
