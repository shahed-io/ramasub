import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck, Save, Loader2, ShieldAlert, Clock, RefreshCw,
  KeyRound, Copy, Download, AlertTriangle, Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadSecuritySettings,
  saveSecuritySettings,
  DEFAULT_SECURITY_SETTINGS,
  type AdminSecuritySettings,
} from "@/lib/admin-security";
import { revokeAdminMfaGrants, checkAdminMfaGrant } from "@/lib/admin-mfa.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/security")({
  component: AdminSecurityPage,
});

const BACKUP_KIND = "admin_mfa_backup_codes";

function AdminSecurityPage() {
  const [settings, setSettings] = useState<AdminSecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [factorCount, setFactorCount] = useState<{ verified: number; pending: number }>({ verified: 0, pending: 0 });
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);

  const checkGrant = useServerFn(checkAdminMfaGrant);
  const revokeGrants = useServerFn(revokeAdminMfaGrants);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings, id } = await loadSecuritySettings();
      setSettings(settings);
      setRecordId(id);
      try { await checkGrant(); } catch { /* ignore */ }
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const totp = (data?.totp ?? []) as Array<{ status: string }>;
        setFactorCount({
          verified: totp.filter((f) => f.status === "verified").length,
          pending: totp.filter((f) => f.status === "unverified").length,
        });
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, [checkGrant]);

  useEffect(() => { load(); }, [load]);

  const update = (patch: Partial<AdminSecuritySettings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const { id } = await saveSecuritySettings(settings, recordId);
      setRecordId(id);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const disable2FA = async () => {
    if (disableCode.trim().length < 6) return toast.error("6-digit code লিখুন");
    setDisabling(true);
    try {
      const { data: list } = await supabase.auth.mfa.listFactors();
      const verified = ((list?.totp ?? []) as Array<{ id: string; status: string }>).filter(f => f.status === "verified");
      if (!verified.length) throw new Error("No active authenticator factor");
      const factorId = verified[0].id;
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch!.id, code: disableCode.trim() });
      if (vErr) throw vErr;
      for (const f of verified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      try { await revokeGrants(); } catch { /* ignore */ }
      update({ mfa_enforced: false });
      await saveSecuritySettings({ ...settings, mfa_enforced: false }, recordId);
      setDisableCode("");
      toast.success("2FA disabled");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Disable failed");
    } finally {
      setDisabling(false);
    }
  };

  const resetAuthenticator = async () => {
    if (!confirm("Authenticator factor reset করবেন? পরের login-এ নতুন QR scan করতে হবে।")) return;
    setResetting(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = (data?.totp ?? []) as Array<{ id: string }>;
      for (const f of totp) {
        try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch { /* ignore */ }
      }
      try { await revokeGrants(); } catch { /* ignore */ }
      toast.success("Authenticator reset — login-এ নতুন QR পাবেন");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const generateBackupCodes = async () => {
    if (!confirm("নতুন backup codes তৈরি করবেন? পুরনো সব code invalid হয়ে যাবে।")) return;
    setGeneratingCodes(true);
    try {
      const codes: string[] = [];
      const bytes = new Uint8Array(8 * 5);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < 8; i++) {
        const slice = bytes.slice(i * 5, i * 5 + 5);
        const code = Array.from(slice).map(b => b.toString(36)).join("").toUpperCase().slice(0, 10);
        codes.push(`${code.slice(0, 5)}-${code.slice(5, 10)}`);
      }
      const { data: existing } = await supabase
        .from("admin_records").select("id").eq("kind", BACKUP_KIND).limit(1).maybeSingle();
      const payload = { kind: BACKUP_KIND, data: { codes, generated_at: new Date().toISOString() } as never, is_active: true };
      const op = existing?.id
        ? supabase.from("admin_records").update(payload).eq("id", existing.id)
        : supabase.from("admin_records").insert(payload);
      const { error } = await op;
      if (error) throw error;
      setBackupCodes(codes);
      toast.success("Backup codes তৈরি হয়েছে");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGeneratingCodes(false);
    }
  };

  const downloadCodes = () => {
    if (!backupCodes) return;
    const text = `AccessNow BD — Admin 2FA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join("\n")}\n\nKeep these codes safe. Each can be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const has2FA = factorCount.verified > 0;

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Intro card */}
      <Card>
        <div className="flex items-center gap-2.5 mb-2">
          <ShieldCheck className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Two-Factor Authentication</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Protect the admin panel with Google Authenticator. After your password, you'll need a 6-digit code from your phone.
        </p>
      </Card>

      {/* Session Settings */}
      <Card>
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-violet-600" strokeWidth={2.5} />
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Session Settings</h2>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Control how long an admin stays signed in after passing 2FA, and whether the "Remember this device" option appears at login.
        </p>

        {/* Master enable */}
        <label className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
          settings.mfa_enforced ? "border-violet-200 bg-violet-50/60" : "border-slate-200 bg-slate-50/60"
        }`}>
          <Checkbox checked={settings.mfa_enforced} onChange={(v) => update({ mfa_enforced: v })} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              Authenticator system {settings.mfa_enforced ? "ENABLED" : "DISABLED"} (global)
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Master switch for the entire admin 2FA system. When OFF, no admin will be asked for an authenticator code at login.
              Individual enrollments are preserved and re-activate when this is turned back ON.
            </p>
          </div>
        </label>

        {/* Lengths */}
        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <NumberField
            label="Standard session length"
            unit="h"
            unitValue={`${settings.grant_ttl_hours}h`}
            value={settings.grant_ttl_hours}
            min={1} max={720}
            onChange={(v) => update({ grant_ttl_hours: v })}
            hint="Hours (1–720). Default 12."
          />
          <NumberField
            label='"Remember this device" length'
            unit="d"
            unitValue={`${settings.remember_device_days}d`}
            value={settings.remember_device_days}
            min={1} max={365}
            onChange={(v) => update({ remember_device_days: v })}
            hint="Days (1–365). Default 30."
          />
        </div>

        {/* Remember device toggle */}
        <label className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
          settings.remember_device_enabled ? "border-violet-200 bg-violet-50/60" : "border-slate-200 bg-slate-50/60"
        }`}>
          <Checkbox checked={settings.remember_device_enabled} onChange={(v) => update({ remember_device_enabled: v })} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">Allow "Remember this device" at login</div>
            <p className="text-xs text-slate-600 mt-1">
              When off, every login uses the standard session length above.
            </p>
          </div>
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="h-11 px-6 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-bold inline-flex items-center gap-2 shadow-md shadow-violet-200 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
          <p className="text-xs text-slate-500">
            Changes apply to <b>new</b> logins. Existing sessions keep their original expiry.
          </p>
        </div>
      </Card>

      {/* 2FA status */}
      <Card>
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          <h2 className="text-base font-bold text-slate-900">
            2FA is currently{" "}
            <span className={`underline underline-offset-4 ${has2FA ? "text-emerald-700" : "text-slate-500"}`}>
              {has2FA ? "enabled" : "disabled"}
            </span>
          </h2>
        </div>

        {/* Disable 2FA */}
        {has2FA && (
          <div className="pt-5 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Disable 2FA
            </div>
            <p className="text-xs text-slate-500 mt-1">Enter your current 6-digit code (or a backup code) to disable.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                className="flex-1 h-11 px-4 rounded-full border border-slate-200 text-sm bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={disable2FA}
                disabled={disabling || disableCode.length < 6}
                className="h-11 px-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-60"
              >
                {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Disable
              </button>
            </div>
          </div>
        )}

        {/* Reset Authenticator */}
        <div className="pt-5 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <RefreshCw className="w-4 h-4 text-violet-600" />
            Lost your Authenticator?
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Reset the current setup and scan a new QR code. Authorized either by your active admin session, or by a fresh email verification code sent to all admins.
          </p>
          <button
            onClick={resetAuthenticator}
            disabled={resetting}
            className="mt-3 h-10 px-5 rounded-full bg-white border border-violet-200 hover:bg-violet-50 text-violet-700 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Reset Authenticator
          </button>
        </div>

        {/* Backup Codes */}
        <div className="pt-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <KeyRound className="w-4 h-4 text-violet-600" />
            Backup Codes
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Generate 8 single-use recovery codes. Use them to log in if you lose your authenticator. Generating new codes will invalidate any previous codes.
          </p>

          {backupCodes && (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Check className="w-4 h-4" /> Save these codes somewhere safe — they won't be shown again.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c) => (
                  <div key={c} className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-slate-800">{c}</div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast.success("Copied"); }}
                  className="h-9 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  onClick={downloadCodes}
                  className="h-9 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
            </div>
          )}

          <button
            onClick={generateBackupCodes}
            disabled={generatingCodes}
            className="mt-3 h-10 px-5 rounded-full bg-white border border-violet-200 hover:bg-violet-50 text-violet-700 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {generatingCodes ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Generate Backup Codes
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm">
      {children}
    </section>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      className={`shrink-0 w-5 h-5 rounded-md grid place-items-center transition ${
        checked
          ? "bg-violet-600 ring-1 ring-violet-700"
          : "bg-white border border-slate-300 hover:border-violet-300"
      }`}
      aria-pressed={checked}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

function NumberField({
  label, value, onChange, min, max, hint, unitValue,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; hint: string; unit: string; unitValue: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-bold text-slate-900">{label}</label>
        <span className="text-xs font-bold text-slate-500">{unitValue}</span>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="mt-2 w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      <p className="text-[11px] text-slate-500 mt-1">{hint}</p>
    </div>
  );
}
