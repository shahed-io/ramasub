import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RateLimitRule = {
  key: string;
  label: string;
  category: string;
  window_seconds: number;
  max_requests: number;
  backoff_base_seconds: number;
  backoff_max_seconds: number;
  enabled: boolean;
  notes: string | null;
  updated_at: string;
};

export type RateLimitBlock = {
  id: string;
  key: string;
  identifier: string;
  strikes: number;
  blocked_until: string;
  last_violation_at: string;
};

export type AuthGuardResult = {
  allowed: boolean;
  retryAfter: number;
  message: string | null;
};

/**
 * Public guard called right before a client-side Supabase auth call.
 * Strict per-IP + per-account limits with exponential backoff (see
 * rate_limit_rules; all thresholds are admin-configurable).
 */
export const guardAuthAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "login" | "signup" | "reset" | "otp"; email?: string }) => {
    const action = input?.action;
    if (action !== "login" && action !== "signup" && action !== "reset" && action !== "otp") {
      throw new Error("Invalid action");
    }
    return { action, email: typeof input.email === "string" ? input.email.slice(0, 255) : "" };
  })
  .handler(async ({ data }): Promise<AuthGuardResult> => {
    const { guardAuth, retryMessage } = await import("@/lib/rate-limit.server");
    const v = await guardAuth(data.action, data.email || null);
    return {
      allowed: v.allowed,
      retryAfter: v.retryAfter,
      message: v.allowed ? null : retryMessage(v),
    };
  });

/** Looser guard for signed-in user actions. */
export const guardUserActionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key?: string }) => ({
    key: typeof input?.key === "string" && input.key ? input.key.slice(0, 100) : "user.action",
  }))
  .handler(async ({ data, context }): Promise<AuthGuardResult> => {
    const { guardUserAction, retryMessage } = await import("@/lib/rate-limit.server");
    const v = await guardUserAction(data.key, context.userId);
    return {
      allowed: v.allowed,
      retryAfter: v.retryAfter,
      message: v.allowed ? null : retryMessage(v),
    };
  });

async function adminGuard(context: {
  supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(context.userId);
}

export const listRateLimitRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RateLimitRule[]> => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("rate_limit_rules")
      .select("key, label, category, window_seconds, max_requests, backoff_base_seconds, backoff_max_seconds, enabled, notes, updated_at")
      .order("category")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []) as RateLimitRule[];
  });

export const updateRateLimitRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    key: string;
    window_seconds: number;
    max_requests: number;
    backoff_base_seconds: number;
    backoff_max_seconds: number;
    enabled: boolean;
    label?: string;
    notes?: string;
  }) => {
    if (!input?.key) throw new Error("key required");
    const num = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };
    return {
      key: String(input.key).slice(0, 100),
      window_seconds: num(input.window_seconds, 1, 86_400, 60),
      max_requests: num(input.max_requests, 1, 100_000, 60),
      backoff_base_seconds: num(input.backoff_base_seconds, 0, 86_400, 0),
      backoff_max_seconds: num(input.backoff_max_seconds, 0, 604_800, 3600),
      enabled: Boolean(input.enabled),
      label: typeof input.label === "string" ? input.label.slice(0, 120) : undefined,
      notes: typeof input.notes === "string" ? input.notes.slice(0, 500) : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { key, label, notes, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (label !== undefined) patch.label = label;
    if (notes !== undefined) patch.notes = notes;
    const { error } = await supabaseAdmin.from("rate_limit_rules").update(patch).eq("key", key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRateLimitBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RateLimitBlock[]> => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("rate_limit_blocks")
      .select("id, key, identifier, strikes, blocked_until, last_violation_at")
      .order("last_violation_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as RateLimitBlock[];
  });

export const clearRateLimitBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("rate_limit_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cleanupRateLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("cleanup_rate_limits");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
