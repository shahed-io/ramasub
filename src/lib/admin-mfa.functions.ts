import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OTP_TTL_MIN = 10;
const GRANT_TTL_HOURS = 12;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

async function listAdminEmails(): Promise<string[]> {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  const ids = (roles ?? []).map((r) => r.user_id as string);
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    const email = data?.user?.email;
    if (email) emails.push(email);
  }
  return Array.from(new Set(emails));
}

async function sendOtpEmail(emails: string[], code: string, requesterEmail: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[admin-mfa] RESEND_API_KEY not configured — OTP code ${code} for ${requesterEmail}. Recipients would be: ${emails.join(", ")}`,
    );
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
      <h1 style="font-size:18px;margin:0 0 12px">AccessNow BD — Admin Login Code</h1>
      <p style="font-size:14px;color:#475569;margin:0 0 20px">
        Login attempt by <b>${requesterEmail}</b>. If this wasn't you, ignore this email and revoke admin access immediately.
      </p>
      <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:18px;text-align:center;color:#0f172a">
        ${code}
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:20px 0 0">
        This code expires in ${OTP_TTL_MIN} minutes. Never share it with anyone.
      </p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AccessNow BD Admin <onboarding@resend.dev>",
      to: emails,
      subject: `Admin login code: ${code}`,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[admin-mfa] Resend error", res.status, text);
    return { sent: false, reason: `Resend ${res.status}` };
  }
  return { sent: true };
}

/** Returns whether the current user has a valid admin MFA grant. */
export const checkAdminMfaGrant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertAdmin(userId);
    const { data, error } = await supabaseAdmin
      .from("admin_mfa_grants")
      .select("id, expires_at, method")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { granted: !!data, expiresAt: data?.expires_at ?? null, method: data?.method ?? null };
  });

/** Generate a 6-digit OTP, store its hash, and email all admin addresses. */
export const requestAdminEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertAdmin(userId);

    // Rate-limit: don't allow more than one unconsumed code in last 60s.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("admin_otp_codes")
      .select("id")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .gt("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) {
      return { sent: false, throttled: true, message: "একটু অপেক্ষা করুন — code-টি ১ মিনিট আগে পাঠানো হয়েছে।" };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from("admin_otp_codes").insert({
      user_id: userId,
      code_hash: hashCode(code),
      expires_at: expiresAt,
    });
    if (insertErr) throw new Error(insertErr.message);

    const emails = await listAdminEmails();
    if (emails.length === 0) throw new Error("No admin emails found");

    const requesterEmail =
      (context.claims as any)?.email ||
      (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email ||
      "unknown";

    const result = await sendOtpEmail(emails, code, requesterEmail);

    return {
      sent: result.sent,
      recipients: emails.length,
      reason: result.sent ? null : (result as any).reason,
      expiresInSeconds: OTP_TTL_MIN * 60,
    };
  });

/** Verify a 6-digit email OTP and create a 12-hour MFA grant. */
export const verifyAdminEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ code: z.string().regex(/^\d{6}$/, "6 digit code required") }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    await assertAdmin(userId);

    const { data: row, error } = await supabaseAdmin
      .from("admin_otp_codes")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No active code — request a new one");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Code expired — request a new one");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new Error("Too many attempts — request a new code");
    }

    if (hashCode(data.code) !== row.code_hash) {
      await supabaseAdmin
        .from("admin_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Wrong code");
    }

    await supabaseAdmin
      .from("admin_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const expiresAt = new Date(Date.now() + GRANT_TTL_HOURS * 3600_000).toISOString();
    await supabaseAdmin.from("admin_mfa_grants").insert({
      user_id: userId,
      method: "email",
      expires_at: expiresAt,
    });

    return { ok: true, expiresAt };
  });

/** Record a TOTP-based grant after the client verifies via supabase.auth.mfa. */
export const recordAdminTotpGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertAdmin(userId);
    // Require the caller's session to be at AAL2 (second factor verified server-side).
    // Without this check, an admin with a password-only (AAL1) session could call
    // this fn directly and obtain a 12-hour grant, bypassing TOTP entirely.
    const aal = (context.claims as any)?.aal;
    if (aal !== "aal2") {
      throw new Error("TOTP verification required before granting access");
    }
    const expiresAt = new Date(Date.now() + GRANT_TTL_HOURS * 3600_000).toISOString();
    await supabaseAdmin.from("admin_mfa_grants").insert({
      user_id: userId,
      method: "totp",
      expires_at: expiresAt,
    });
    return { ok: true, expiresAt };
  });

/** Revoke all active grants (used for sign-out / "lock again"). */
export const revokeAdminMfaGrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await supabaseAdmin
      .from("admin_mfa_grants")
      .update({ expires_at: new Date().toISOString() })
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString());
    return { ok: true };
  });
