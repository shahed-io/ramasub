import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validator, z, uuid, email as emailSchema, optText, intIn, bool } from "@/lib/validation";

/** Rule/bucket keys are dotted identifiers, e.g. "auth.login.ip". */
const ruleKey = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, { message: "Invalid rate limit key" });

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
  .inputValidator(
    validator(
      z
        .object({
          action: z.enum(["login", "signup", "reset", "otp"]),
          // An invalid address can never match an account, so reject it here
          // rather than counting it against a bogus per-account bucket.
          email: emailSchema.optional(),
        })
        .strict(),
    ),
  )
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
  .inputValidator(validator(z.object({ key: ruleKey.default("user.action") }).strict().default({ key: "user.action" })))
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
  .inputValidator(
    validator(
      z
        .object({
          key: ruleKey,
          window_seconds: intIn(1, 86_400),
          max_requests: intIn(1, 100_000),
          backoff_base_seconds: intIn(0, 86_400),
          backoff_max_seconds: intIn(0, 604_800),
          enabled: bool,
          label: optText(120),
          notes: optText(500),
        })
        .strict()
        .refine((v) => v.backoff_max_seconds >= v.backoff_base_seconds, {
          message: "Max wait must be greater than or equal to the backoff base",
          path: ["backoff_max_seconds"],
        }),
    ),
  )
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { key, label, notes, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("rate_limit_rules")
      .update({
        ...rest,
        ...(label !== undefined ? { label } : {}),
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq("key", key);
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
  .inputValidator(validator(z.object({ id: uuid }).strict()))
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
