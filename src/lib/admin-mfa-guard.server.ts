import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * SECURITY: server-side enforcement of the "require MFA for admins" setting.
 *
 * The admin dashboard renders <AdminMfaGate> which blocks the UI until a valid
 * row exists in admin_mfa_grants. That check is client-side only — a stolen or
 * replayed admin access token could previously call every admin server function
 * directly and skip MFA entirely. This helper re-checks the same grant table on
 * the server so privileged server functions honour the setting too.
 *
 * When mfa_enforced is off, this is a no-op (role check alone still applies).
 */
export async function assertAdminMfaGrant(userId: string): Promise<void> {
  if (!userId) throw new Error("Forbidden: admin role required");

  // Read the global security settings (admin_records / kind = security_settings).
  const { data: rec } = await supabaseAdmin
    .from("admin_records")
    .select("data")
    .eq("kind", "security_settings")
    .limit(1)
    .maybeSingle();

  const enforced = (rec?.data as any)?.mfa_enforced === true;
  if (!enforced) return;

  const { data: grant, error } = await supabaseAdmin
    .from("admin_mfa_grants")
    .select("id")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("MFA verification failed");
  if (!grant) {
    throw new Error("Forbidden: two-factor verification required");
  }
}
