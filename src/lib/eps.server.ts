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

/** Read EPS credentials from the admin_records table (kind: "eps_pgw"),
 *  falling back to environment variables. Admins configure everything from
 *  /Mahbub214/eps-pgw — no redirects or secret forms required. */
export async function getEpsCreds() {
  let merchant_id: string | undefined;
  let store_id: string | undefined;
  let store_password: string | undefined;
  let api_key: string | undefined;
  let mode: EpsMode = "sandbox";
  let enabled = false;
  let callback_url: string | undefined;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_records")
      .select("data,is_active")
      .eq("kind", "eps_pgw")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const d = ((data as any)?.data ?? {}) as Record<string, unknown>;
    merchant_id = (d.merchant_id as string) || undefined;
    store_id = (d.store_id as string) || undefined;
    store_password = (d.store_password as string) || undefined;
    api_key = (d.api_key as string) || undefined;
    callback_url = (d.callback_url as string) || undefined;
    const env = (d.environment as string) || "sandbox";
    mode = env === "live" ? "live" : "sandbox";
    enabled = Boolean((data as any)?.is_active) && Boolean(d.enabled);
  } catch {
    // fall through to env fallbacks below
  }

  merchant_id ||= process.env.EPS_MERCHANT_ID;
  store_id ||= process.env.EPS_STORE_ID;
  store_password ||= process.env.EPS_STORE_PASSWORD;
  api_key ||= process.env.EPS_API_KEY;
  if (process.env.EPS_MODE === "live" || process.env.EPS_MODE === "sandbox") {
    mode = process.env.EPS_MODE as EpsMode;
  }

  const missing = [
    !merchant_id && "Merchant ID",
    !store_id && "Store ID",
    !store_password && "Store Password",
    !api_key && "API Key",
  ].filter(Boolean) as string[];

  return { merchant_id, store_id, store_password, api_key, mode, missing, enabled, callback_url };
}

export function epsBase(mode?: EpsMode) {
  const m = mode || "sandbox";
  return m === "live" ? LIVE_BASE : SANDBOX_BASE;
}

// In-memory access-token cache (worker-scoped)
let cached: { token: string; exp: number; key: string } | null = null;

/** Obtain an access token from EPS using store credentials + API key. */
export async function getEpsToken(mode?: EpsMode): Promise<string> {
  const creds = await getEpsCreds();
  const m = mode || creds.mode;
  const cacheKey = `${m}:${creds.store_id}`;
  if (cached && cached.key === cacheKey && cached.exp - 30_000 > Date.now()) return cached.token;
  if (creds.missing.length) throw new Error(`Missing EPS credentials: ${creds.missing.join(", ")}`);

  const res = await fetch(`${epsBase(m)}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": creds.api_key!,
    },
    body: JSON.stringify({ store_id: creds.store_id, store_password: creds.store_password }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  const token: string | undefined =
    j?.access_token || j?.token || j?.data?.access_token;
  if (!res.ok || !token) {
    throw new Error(j?.message || j?.error || `EPS token failed (${res.status})`);
  }
  const ttlSec = Number(j?.expires_in || 3600);
  cached = { token, exp: Date.now() + Math.min(ttlSec, 3600) * 1000, key: cacheKey };
  return token;
}

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
