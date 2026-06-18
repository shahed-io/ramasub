import { supabase } from "@/integrations/supabase/client";

export type AdminSecuritySettings = {
  mfa_enforced: boolean;
  allow_totp: boolean;
  allow_email_otp: boolean;
  grant_ttl_hours: number;
  remember_device_enabled: boolean;
  remember_device_days: number;
};

export const DEFAULT_SECURITY_SETTINGS: AdminSecuritySettings = {
  mfa_enforced: false,
  allow_totp: true,
  allow_email_otp: true,
  grant_ttl_hours: 12,
  remember_device_enabled: true,
  remember_device_days: 30,
};

export const SECURITY_KIND = "security_settings";

function normalize(raw: any): AdminSecuritySettings {
  const d: any = raw ?? {};
  return {
    mfa_enforced: typeof d.mfa_enforced === "boolean" ? d.mfa_enforced : DEFAULT_SECURITY_SETTINGS.mfa_enforced,
    allow_totp: typeof d.allow_totp === "boolean" ? d.allow_totp : DEFAULT_SECURITY_SETTINGS.allow_totp,
    allow_email_otp: typeof d.allow_email_otp === "boolean" ? d.allow_email_otp : DEFAULT_SECURITY_SETTINGS.allow_email_otp,
    grant_ttl_hours:
      typeof d.grant_ttl_hours === "number" && d.grant_ttl_hours > 0 && d.grant_ttl_hours <= 720
        ? Math.floor(d.grant_ttl_hours)
        : DEFAULT_SECURITY_SETTINGS.grant_ttl_hours,
    remember_device_enabled:
      typeof d.remember_device_enabled === "boolean"
        ? d.remember_device_enabled
        : DEFAULT_SECURITY_SETTINGS.remember_device_enabled,
    remember_device_days:
      typeof d.remember_device_days === "number" && d.remember_device_days > 0 && d.remember_device_days <= 365
        ? Math.floor(d.remember_device_days)
        : DEFAULT_SECURITY_SETTINGS.remember_device_days,
  };
}

/** Load settings (returns defaults if no row exists). */
export async function loadSecuritySettings(): Promise<{ settings: AdminSecuritySettings; id: string | null }> {
  const { data, error } = await supabase
    .from("admin_records")
    .select("id, data")
    .eq("kind", SECURITY_KIND)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    // ignore "no rows" — return defaults
    console.warn("[admin-security] load error:", error.message);
  }
  return {
    settings: normalize(data?.data),
    id: data?.id ?? null,
  };
}

export async function saveSecuritySettings(
  settings: AdminSecuritySettings,
  existingId: string | null,
): Promise<{ id: string }> {
  const payload = { kind: SECURITY_KIND, data: settings as never, is_active: true };
  const op = existingId
    ? supabase.from("admin_records").update(payload).eq("id", existingId).select("id").single()
    : supabase.from("admin_records").insert(payload).select("id").single();
  const { data, error } = await op;
  if (error) throw new Error(error.message);
  return { id: data!.id };
}
