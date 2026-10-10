/**
 * Server-only bot verification + DDoS shield helpers.
 *
 * Two layers, both enabled by default:
 *  1. Built-in shield  — proof-of-work challenge + honeypot + timing check.
 *  2. Cloudflare Turnstile — used automatically when a site key is saved in the
 *     admin panel and TURNSTILE_SECRET_KEY exists as a secret.
 *
 * A successful verification issues a short-lived, single-use "bot pass" token
 * which the signup flow must present server-side before an account is created.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { clientIp } from "@/lib/rate-limit.server";

export type BotShieldSettings = {
  shield_enabled: boolean;
  pow_enabled: boolean;
  pow_difficulty: number;
  turnstile_enabled: boolean;
  turnstile_site_key: string;
  ddos_enabled: boolean;
};

const DEFAULTS: BotShieldSettings = {
  shield_enabled: true,
  pow_enabled: true,
  pow_difficulty: 4,
  turnstile_enabled: false,
  turnstile_site_key: "",
  ddos_enabled: true,
};

let cache: { value: BotShieldSettings; expires: number } | null = null;
const TTL_MS = 30_000;

export async function loadBotSettings(force = false): Promise<BotShieldSettings> {
  const now = Date.now();
  if (!force && cache && cache.expires > now) return cache.value;
  let value = DEFAULTS;
  try {
    const { data } = await supabaseAdmin
      .from("admin_records")
      .select("data")
      .eq("kind", "bot_protection")
      .maybeSingle();
    const raw = (data?.data ?? {}) as Partial<BotShieldSettings>;
    value = {
      shield_enabled: raw.shield_enabled !== false,
      pow_enabled: raw.pow_enabled !== false,
      pow_difficulty: Math.min(6, Math.max(2, Number(raw.pow_difficulty ?? 4) || 4)),
      turnstile_enabled: raw.turnstile_enabled === true,
      turnstile_site_key: String(raw.turnstile_site_key ?? "").trim().slice(0, 200),
      ddos_enabled: raw.ddos_enabled !== false,
    };
  } catch (e) {
    console.warn("[bot-shield] settings load failed", e);
  }
  cache = { value, expires: now + TTL_MS };
  return value;
}

export function invalidateBotSettings() {
  cache = null;
}

export async function saveBotSettings(next: BotShieldSettings): Promise<BotShieldSettings> {
  const { data: existing } = await supabaseAdmin
    .from("admin_records")
    .select("id")
    .eq("kind", "bot_protection")
    .maybeSingle();
  if (existing?.id) {
    await supabaseAdmin.from("admin_records").update({ data: next as never }).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("admin_records").insert({ kind: "bot_protection", data: next as never } as never);
  }
  invalidateBotSettings();
  return next;
}

// ── proof of work ────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when the server can reach privileged backend tables (missing on a self-hosted/local server without the service key). */
function hasAdminAccess(): boolean {
  return !!(process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

export async function createChallenge(purpose: string, request?: Request) {
  if (!hasAdminAccess()) return { id: "00000000-0000-0000-0000-000000000000", salt: randomHex(16), difficulty: 1 };
  const settings = await loadBotSettings();
  const salt = randomHex(16);
  const difficulty = settings.pow_difficulty;
  const { data, error } = await supabaseAdmin
    .from("bot_challenges")
    .insert({ salt, difficulty, purpose, ip: clientIp(request) } as never)
    .select("id")
    .single();
  if (error) throw new Error("Could not start verification");
  return { id: (data as { id: string }).id, salt, difficulty };
}

async function issuePass(purpose: string, provider: string, request?: Request): Promise<string> {
  const token = `${randomHex(24)}`;
  const { error } = await supabaseAdmin
    .from("bot_passes")
    .insert({ token, purpose, provider, ip: clientIp(request) } as never);
  if (error) throw new Error("Could not complete verification");
  return token;
}

/** Verify a solved challenge and/or a Turnstile token; returns a bot pass. */
export async function verifyHumanAttempt(input: {
  purpose: string;
  challengeId?: string;
  nonce?: string;
  turnstileToken?: string;
  elapsedMs?: number;
  honeypot?: string;
  request?: Request;
}): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (!hasAdminAccess()) {
    if (input.honeypot && input.honeypot.trim() !== "") return { ok: false, reason: "Automated submission detected." };
    return { ok: true, token: "self-hosted" };
  }
  const settings = await loadBotSettings();
  if (!settings.shield_enabled) {
    return { ok: true, token: await issuePass(input.purpose, "disabled", input.request) };
  }

  // Honeypot — real users never fill a hidden field.
  if (input.honeypot && input.honeypot.trim() !== "") {
    return { ok: false, reason: "Automated submission detected." };
  }
  // Humans need at least ~1.2s to fill a form.
  if (typeof input.elapsedMs === "number" && input.elapsedMs >= 0 && input.elapsedMs < 1200) {
    return { ok: false, reason: "Form submitted too quickly. Please try again." };
  }

  let provider = "honeypot";

  if (settings.turnstile_enabled && settings.turnstile_site_key) {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!input.turnstileToken) return { ok: false, reason: "Please complete the human verification." };
    if (!secret) return { ok: false, reason: "Verification is not configured. Please contact support." };
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: input.turnstileToken.slice(0, 4096),
          remoteip: clientIp(input.request),
        }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) return { ok: false, reason: "Human verification failed. Please try again." };
      provider = "turnstile";
    } catch (e) {
      console.warn("[bot-shield] turnstile verify failed", e);
      return { ok: false, reason: "Verification service unavailable. Please try again." };
    }
  }

  if (settings.pow_enabled) {
    if (!input.challengeId || !input.nonce) {
      return { ok: false, reason: "Verification incomplete. Please reload the page." };
    }
    const { data } = await supabaseAdmin
      .from("bot_challenges")
      .select("id, salt, difficulty, solved_at, expires_at")
      .eq("id", input.challengeId)
      .maybeSingle();
    const row = data as
      | { id: string; salt: string; difficulty: number; solved_at: string | null; expires_at: string }
      | null;
    if (!row) return { ok: false, reason: "Verification expired. Please reload the page." };
    if (row.solved_at) return { ok: false, reason: "Verification already used. Please reload the page." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "Verification expired. Please reload the page." };
    }
    const hash = await sha256Hex(`${row.salt}:${input.nonce}`);
    if (!hash.startsWith("0".repeat(row.difficulty))) {
      return { ok: false, reason: "Verification failed. Please try again." };
    }
    await supabaseAdmin
      .from("bot_challenges")
      .update({ solved_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    if (provider === "honeypot") provider = "pow";
  }

  return { ok: true, token: await issuePass(input.purpose, provider, input.request) };
}

/** Consume a bot pass (single use). Returns true when the caller is verified. */
export async function consumeBotPass(token: string, purpose: string): Promise<boolean> {
  if (!hasAdminAccess()) return true;
  const settings = await loadBotSettings();
  if (!settings.shield_enabled) return true;
  if (!token) return false;
  try {
    const { data } = await supabaseAdmin
      .from("bot_passes")
      .select("token, purpose, used_at, expires_at")
      .eq("token", token)
      .maybeSingle();
    const row = data as
      | { token: string; purpose: string; used_at: string | null; expires_at: string }
      | null;
    if (!row || row.purpose !== purpose || row.used_at) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    await supabaseAdmin
      .from("bot_passes")
      .update({ used_at: new Date().toISOString() } as never)
      .eq("token", token);
    return true;
  } catch (e) {
    console.warn("[bot-shield] pass consume failed", e);
    return false;
  }
}

/** Housekeeping — drop expired challenges and passes. */
export async function cleanupBotShield(): Promise<number> {
  const nowIso = new Date().toISOString();
  const a = await supabaseAdmin.from("bot_challenges").delete().lt("expires_at", nowIso).select("id");
  const b = await supabaseAdmin.from("bot_passes").delete().lt("expires_at", nowIso).select("token");
  return (a.data?.length ?? 0) + (b.data?.length ?? 0);
}
