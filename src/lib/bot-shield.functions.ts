import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validator, z } from "@/lib/validation";

export type PublicBotConfig = {
  enabled: boolean;
  powEnabled: boolean;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
};

export type BotChallenge = { id: string; salt: string; difficulty: number };

export type BotVerifyResult = { ok: boolean; token: string | null; reason: string | null };

export type BotProtectionSettings = {
  shield_enabled: boolean;
  pow_enabled: boolean;
  pow_difficulty: number;
  turnstile_enabled: boolean;
  turnstile_site_key: string;
  ddos_enabled: boolean;
  turnstile_secret_configured: boolean;
};

const purposeSchema = z.enum(["signup", "login", "reset", "contact"]);

/** Public: what the browser needs to render the verification widget. */
export const getBotShieldConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicBotConfig> => {
    const { loadBotSettings } = await import("@/lib/bot-shield.server");
    const s = await loadBotSettings();
    return {
      enabled: s.shield_enabled,
      powEnabled: s.pow_enabled,
      turnstileEnabled: s.turnstile_enabled && !!s.turnstile_site_key,
      turnstileSiteKey: s.turnstile_enabled ? s.turnstile_site_key : "",
    };
  },
);

/** Public: issue a proof-of-work challenge (rate limited per IP). */
export const issueBotChallenge = createServerFn({ method: "POST" })
  .inputValidator(validator(z.object({ purpose: purposeSchema }).strict()))
  .handler(async ({ data }): Promise<BotChallenge | null> => {
    const { guardPublicRoute } = await import("@/lib/rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const rl = await guardPublicRoute("bot.challenge.ip", request);
    if (!rl.allowed) throw new Error("Too many verification attempts. Please try again later.");
    const { createChallenge, loadBotSettings } = await import("@/lib/bot-shield.server");
    const s = await loadBotSettings();
    if (!s.shield_enabled || !s.pow_enabled) return null;
    return createChallenge(data.purpose, request);
  });

/** Public: verify the solved challenge / Turnstile token and issue a bot pass. */
export const verifyBotChallenge = createServerFn({ method: "POST" })
  .inputValidator(
    validator(
      z
        .object({
          purpose: purposeSchema,
          challengeId: z.string().uuid().optional(),
          nonce: z.string().trim().max(64).regex(/^[0-9]+$/).optional(),
          turnstileToken: z.string().trim().max(4096).optional(),
          elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
          honeypot: z.string().max(200).optional(),
        })
        .strict(),
    ),
  )
  .handler(async ({ data }): Promise<BotVerifyResult> => {
    const { guardPublicRoute } = await import("@/lib/rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const rl = await guardPublicRoute("bot.verify.ip", request);
    if (!rl.allowed) {
      return { ok: false, token: null, reason: "Too many attempts. Please try again later." };
    }
    const { verifyHumanAttempt } = await import("@/lib/bot-shield.server");
    const result = await verifyHumanAttempt({ ...data, request });
    return result.ok
      ? { ok: true, token: result.token, reason: null }
      : { ok: false, token: null, reason: result.reason };
  });

/** Public: consumed by the signup flow — proves the visitor passed the shield. */
export const assertBotPass = createServerFn({ method: "POST" })
  .inputValidator(
    validator(
      z.object({ token: z.string().trim().min(8).max(128), purpose: purposeSchema }).strict(),
    ),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { consumeBotPass } = await import("@/lib/bot-shield.server");
    return { ok: await consumeBotPass(data.token, data.purpose) };
  });

// ── admin ────────────────────────────────────────────────────────────────────

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

export const getBotProtectionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BotProtectionSettings> => {
    await adminGuard(context as never);
    const { loadBotSettings } = await import("@/lib/bot-shield.server");
    const s = await loadBotSettings(true);
    return { ...s, turnstile_secret_configured: !!process.env["TURNSTILE_SECRET_KEY"] };
  });

export const updateBotProtectionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    validator(
      z
        .object({
          shield_enabled: z.boolean(),
          pow_enabled: z.boolean(),
          pow_difficulty: z.number().int().min(2).max(6),
          turnstile_enabled: z.boolean(),
          turnstile_site_key: z.string().trim().max(200),
          ddos_enabled: z.boolean(),
        })
        .strict(),
    ),
  )
  .handler(async ({ data, context }): Promise<BotProtectionSettings> => {
    await adminGuard(context as never);
    const { saveBotSettings } = await import("@/lib/bot-shield.server");
    const saved = await saveBotSettings(data);
    return { ...saved, turnstile_secret_configured: !!process.env["TURNSTILE_SECRET_KEY"] };
  });

export const cleanupBotShieldFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ removed: number }> => {
    await adminGuard(context as never);
    const { cleanupBotShield } = await import("@/lib/bot-shield.server");
    return { removed: await cleanupBotShield() };
  });
