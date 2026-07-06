// Server-only EPS (eps.com.bd) Payment Gateway helpers.
// Never import from client-reachable files at module scope.
//
// NOTE: The exact endpoint paths and payload field names should be finalized
// against the EPS integration document that ships with your merchant account.
// This scaffold is structured so you only need to plug in credentials via
// secrets — no code changes required to activate live payments.

const SANDBOX_BASE =
  process.env.EPS_SANDBOX_BASE_URL || "https://sandbox.eps.com.bd/api/v1";
const LIVE_BASE =
  process.env.EPS_LIVE_BASE_URL || "https://pay.eps.com.bd/api/v1";

export type EpsMode = "sandbox" | "live";

export function getEpsCreds() {
  const merchant_id = process.env.EPS_MERCHANT_ID;
  const store_id = process.env.EPS_STORE_ID;
  const store_password = process.env.EPS_STORE_PASSWORD;
  const api_key = process.env.EPS_API_KEY;
  const mode = (process.env.EPS_MODE as EpsMode) || "sandbox";
  const missing = [
    !merchant_id && "EPS_MERCHANT_ID",
    !store_id && "EPS_STORE_ID",
    !store_password && "EPS_STORE_PASSWORD",
    !api_key && "EPS_API_KEY",
  ].filter(Boolean) as string[];
  return { merchant_id, store_id, store_password, api_key, mode, missing };
}

export function epsBase(mode?: EpsMode) {
  const m = mode || (process.env.EPS_MODE as EpsMode) || "sandbox";
  return m === "live" ? LIVE_BASE : SANDBOX_BASE;
}

// In-memory access-token cache (worker-scoped)
let cached: { token: string; exp: number } | null = null;

/** Obtain an access token from EPS using store credentials + API key. */
export async function getEpsToken(mode?: EpsMode): Promise<string> {
  if (cached && cached.exp - 30_000 > Date.now()) return cached.token;
  const { store_id, store_password, api_key, missing } = getEpsCreds();
  if (missing.length) throw new Error(`Missing EPS secrets: ${missing.join(", ")}`);

  const res = await fetch(`${epsBase(mode)}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": api_key!,
    },
    body: JSON.stringify({ store_id, store_password }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  const token: string | undefined =
    j?.access_token || j?.token || j?.data?.access_token;
  if (!res.ok || !token) {
    throw new Error(j?.message || j?.error || `EPS token failed (${res.status})`);
  }
  const ttlSec = Number(j?.expires_in || 3600);
  cached = { token, exp: Date.now() + Math.min(ttlSec, 3600) * 1000 };
  return token;
}

async function epsCall(path: string, body: any, mode?: EpsMode) {
  const token = await getEpsToken(mode);
  const { api_key, merchant_id } = getEpsCreds();
  const res = await fetch(`${epsBase(mode)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-API-Key": api_key!,
      "X-Merchant-Id": merchant_id!,
    },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as any;
}

/** Create a hosted-checkout session and get a redirect URL for the customer. */
export function epsCreateSession(
  payload: {
    amount: string;
    invoice: string;
    callbackURL: string;
    cancelURL?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
  },
  mode?: EpsMode,
) {
  return epsCall(
    "/payment/session",
    {
      merchant_invoice: payload.invoice,
      amount: payload.amount,
      currency: "BDT",
      success_url: payload.callbackURL,
      fail_url: payload.callbackURL,
      cancel_url: payload.cancelURL || payload.callbackURL,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
      description: payload.description,
    },
    mode,
  );
}

/** Verify a payment after callback. */
export function epsVerifyPayment(transactionId: string, mode?: EpsMode) {
  return epsCall("/payment/verify", { transaction_id: transactionId }, mode);
}
