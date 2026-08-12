/**
 * Server-only rate limiting helper.
 *
 * All thresholds live in the `rate_limit_rules` table and are editable from the
 * admin panel (/Mahbub214/rate-limits) — nothing is hardcoded here. This module
 * only decides *which* rule key + identifier applies to a given request.
 *
 * Rule categories:
 *  - auth          → strict, per-IP AND per-account, exponential backoff
 *  - public        → moderate, per-IP
 *  - authenticated → looser, per-user
 */
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitVerdict = {
  allowed: boolean;
  reason: string;
  retryAfter: number;
  limit?: number;
  remaining?: number;
  strikes?: number;
  key?: string;
};

const ALLOWED: RateLimitVerdict = { allowed: true, reason: "ok", retryAfter: 0 };

/** Best-effort client IP from the incoming request (Cloudflare aware). */
export function clientIp(request?: Request): string {
  try {
    const fromReq = (name: string) => request?.headers.get(name) ?? null;
    const ip =
      fromReq("cf-connecting-ip") ||
      fromReq("x-forwarded-for")?.split(",")[0]?.trim() ||
      fromReq("x-real-ip") ||
      (request ? null : getRequestIP({ xForwardedFor: true })) ||
      (request ? null : getRequestHeader("cf-connecting-ip")) ||
      null;
    return (ip || "unknown").slice(0, 64);
  } catch {
    return "unknown";
  }
}

/** Normalised, non-reversible-ish account identifier (lowercased email/user id). */
export function accountId(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().slice(0, 190) || "unknown";
}

/**
 * Consume one unit from a rule bucket. Never throws — if the limiter itself
 * fails we fail *open* so a limiter outage can't take the shop offline.
 */
export async function consume(
  key: string,
  identifier: string,
  cost = 1,
): Promise<RateLimitVerdict> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      _key: key,
      _identifier: identifier,
      _cost: Math.max(1, Math.floor(cost)),
    } as never);
    if (error) {
      console.warn("[rate-limit] rpc failed", key, error.message);
      return ALLOWED;
    }
    const r = (data ?? {}) as Record<string, unknown>;
    return {
      allowed: r.allowed !== false,
      reason: String(r.reason ?? "ok"),
      retryAfter: Number(r.retry_after ?? 0) || 0,
      limit: r.limit == null ? undefined : Number(r.limit),
      remaining: r.remaining == null ? undefined : Number(r.remaining),
      strikes: r.strikes == null ? undefined : Number(r.strikes),
      key,
    };
  } catch (e) {
    console.warn("[rate-limit] error", key, e);
    return ALLOWED;
  }
}

/** Check several buckets; the first denial wins (worst retryAfter reported). */
export async function consumeAll(
  buckets: Array<{ key: string; identifier: string; cost?: number }>,
): Promise<RateLimitVerdict> {
  const results = await Promise.all(buckets.map((b) => consume(b.key, b.identifier, b.cost ?? 1)));
  const denied = results.filter((r) => !r.allowed);
  if (denied.length === 0) return results[0] ?? ALLOWED;
  return denied.reduce((worst, r) => (r.retryAfter > worst.retryAfter ? r : worst), denied[0]!);
}

export function retryMessage(v: RateLimitVerdict, bn = false): string {
  const s = Math.max(1, v.retryAfter);
  const human = s >= 3600
    ? `${Math.ceil(s / 3600)} ${bn ? "ঘণ্টা" : "hour(s)"}`
    : s >= 60
      ? `${Math.ceil(s / 60)} ${bn ? "মিনিট" : "minute(s)"}`
      : `${s} ${bn ? "সেকেন্ড" : "second(s)"}`;
  return bn
    ? `অনেকবার চেষ্টা করা হয়েছে। অনুগ্রহ করে ${human} পরে আবার চেষ্টা করুন।`
    : `Too many attempts. Please try again in ${human}.`;
}

/** 429 Response for server routes. */
export function tooManyRequests(v: RateLimitVerdict, extraHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ error: retryMessage(v), retry_after: Math.max(1, v.retryAfter) }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.max(1, v.retryAfter)),
        ...extraHeaders,
      },
    },
  );
}

/** Guard for public server routes: one per-IP bucket. */
export async function guardPublicRoute(
  key: string,
  request: Request,
  cost = 1,
): Promise<RateLimitVerdict> {
  return consume(key, `ip:${clientIp(request)}`, cost);
}

/** Guard for signed-in user actions: per-user + per-IP safety net. */
export async function guardUserAction(
  key: string,
  userId: string,
  request?: Request,
): Promise<RateLimitVerdict> {
  return consumeAll([
    { key, identifier: `user:${accountId(userId)}` },
    { key, identifier: `ip:${clientIp(request)}` },
  ]);
}

/** Guard for auth actions: per-IP + per-account, both with exponential backoff. */
export async function guardAuth(
  action: "login" | "signup" | "reset" | "otp",
  email: string | null,
  request?: Request,
): Promise<RateLimitVerdict> {
  const ip = `ip:${clientIp(request)}`;
  const acct = `acct:${accountId(email)}`;
  switch (action) {
    case "login":
      return consumeAll([
        { key: "auth.login.ip", identifier: ip },
        { key: "auth.login.account", identifier: acct },
      ]);
    case "signup":
      return consume("auth.signup.ip", ip);
    case "reset":
      return consumeAll([
        { key: "auth.reset.ip", identifier: ip },
        { key: "auth.reset.account", identifier: acct },
      ]);
    case "otp":
      return consumeAll([
        { key: "auth.otp.account", identifier: acct },
        { key: "auth.login.ip", identifier: ip },
      ]);
  }
}
