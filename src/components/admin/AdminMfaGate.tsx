import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, KeyRound, Mail, LogOut, RefreshCw, Loader2, Copy, Check, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkAdminMfaGrant,
  requestAdminEmailOtp,
  verifyAdminEmailOtp,
  recordAdminTotpGrant,
} from "@/lib/admin-mfa.functions";
import { loadSecuritySettings, type AdminSecuritySettings } from "@/lib/admin-security";

type Factor = {
  id: string;
  status: "verified" | "unverified";
  factor_type: string;
};

type Mode = "loading" | "ok" | "error" | "challenge" | "enroll";
type Tab = "totp" | "email";

interface Props {
  children: React.ReactNode;
  onSignOut: () => void | Promise<void>;
  userEmail?: string | null;
}

const MFA_OK_CACHE_KEY = "anbd:mfaOk";

function readMfaOkCache(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try { return sessionStorage.getItem(MFA_OK_CACHE_KEY) === "1"; } catch { return false; }
}

export function AdminMfaGate({ children, onSignOut, userEmail }: Props) {
  // Optimistic: if we already passed MFA this session, render children immediately
  // and re-verify in the background. Eliminates the loading flicker on every nav.
  const [mode, setMode] = useState<Mode>(() => (readMfaOkCache() ? "ok" : "loading"));
  const [tab, setTab] = useState<Tab>("totp");
  const [settings, setSettings] = useState<AdminSecuritySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // TOTP enrollment state
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasVerifiedFactor, setHasVerifiedFactor] = useState(false);

  // TOTP challenge state
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  // Common code input
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Email OTP state
  const [emailRequested, setEmailRequested] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState(0);
  const [emailRequesting, setEmailRequesting] = useState(false);

  const initRan = useRef(false);

  const checkGrant = useServerFn(checkAdminMfaGrant);
  const requestEmail = useServerFn(requestAdminEmailOtp);
  const verifyEmail = useServerFn(verifyAdminEmailOtp);
  const recordTotp = useServerFn(recordAdminTotpGrant);

  const refresh = useCallback(async () => {
    setError(null);
    setInfo(null);
    const wasOk = readMfaOkCache();
    if (!wasOk) setMode("loading");
    try {
      // 0+1. Load admin security settings and existing grant in parallel.
      const [settingsRes, grantRes] = await Promise.all([
        loadSecuritySettings(),
        checkGrant().catch((e) => ({ __error: e })) as Promise<any>,
      ]);
      const cfg = settingsRes.settings;
      setSettings(cfg);
      const markOk = () => {
        try { sessionStorage.setItem(MFA_OK_CACHE_KEY, "1"); } catch { /* ignore */ }
        setMode("ok");
      };
      if (!cfg.mfa_enforced) {
        markOk();
        return;
      }
      if (grantRes && !grantRes.__error && grantRes.granted) {
        markOk();
        return;
      }
      // Cache is stale — clear and continue with challenge flow
      try { sessionStorage.removeItem(MFA_OK_CACHE_KEY); } catch { /* ignore */ }



      // 2. Existing aal2 session?
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        try { await recordTotp(); } catch { /* ignore */ }
        setMode("ok");
        return;
      }

      // 3. Pick path based on allowed methods
      if (cfg.allow_totp) {
        const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (factorsErr) throw factorsErr;
        const totp: Factor[] = (factorsData?.totp ?? []) as any;
        const verified = totp.find((f) => f.status === "verified");

        if (verified) {
          setActiveFactorId(verified.id);
          setHasVerifiedFactor(true);
          setMode("challenge");
          setTab("totp");
          return;
        }

        // No verified TOTP — clean up unverified leftovers + start enrollment
        for (const f of totp) {
          if (f.status === "unverified") {
            try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch { /* ignore */ }
          }
        }
        const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `AccessNow BD Admin (${new Date().toISOString().slice(0, 10)})`,
        });
        if (enrollErr) throw enrollErr;
        setEnrollFactorId(enrollData.id);
        setQr(enrollData.totp.qr_code);
        setSecret(enrollData.totp.secret);
        setHasVerifiedFactor(false);
        setMode("enroll");
        setTab("totp");
        return;
      }

      // TOTP disabled — fall back to email-only challenge
      if (cfg.allow_email_otp) {
        setHasVerifiedFactor(false);
        setMode("challenge");
        setTab("email");
        return;
      }

      // No method allowed (shouldn't happen — UI prevents saving this combo)
      throw new Error("কোনো MFA method allow করা নেই — admin panel-এর Security page থেকে enable করুন");
    } catch (e: any) {
      setError(e?.message || "MFA initialization failed");
      setMode("error");
    }
  }, [checkGrant, recordTotp]);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    refresh();
  }, [refresh]);

  const handleVerifyTotp = async () => {
    const trimmed = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("কোডটি ৬ ডিজিটের সংখ্যা হতে হবে");
      return;
    }
    const factorId = mode === "enroll" ? enrollFactorId : activeFactorId;
    if (!factorId) {
      setError("Factor missing — refresh");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chalErr) throw chalErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chal.id,
        code: trimmed,
      });
      if (verErr) throw verErr;
      // Persist a server-side grant for 12h
      try { await recordTotp(); } catch { /* non-fatal */ }
      setCode("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "কোড ভুল — আবার চেষ্টা করুন");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEmail = async () => {
    setEmailRequesting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await requestEmail();
      setEmailRequested(true);
      setEmailRecipients(res.recipients ?? 0);
      if (res.throttled) {
        setInfo(res.message ?? "Try again shortly.");
      } else if (!res.sent) {
        setInfo(`Code generated, কিন্তু email পাঠানো যায়নি (${res.reason ?? "no provider"}). Server logs দেখুন।`);
      } else {
        setInfo(`Code পাঠানো হয়েছে ${res.recipients} admin email-এ — inbox চেক করুন।`);
      }
    } catch (e: any) {
      setError(e?.message || "Email পাঠানো ব্যর্থ");
    } finally {
      setEmailRequesting(false);
    }
  };

  const handleVerifyEmail = async () => {
    const trimmed = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setError("৬ ডিজিটের কোড লিখুন");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyEmail({ data: { code: trimmed } });
      setCode("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "কোড verify করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (mode === "ok") return <>{children}</>;

  if (mode === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f6f7fb]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#f6f7fb] px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 grid place-items-center ring-1 ring-slate-200">
            {mode === "challenge" ? <KeyRound className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">
              {mode === "enroll" && "Two-Factor Setup (Required)"}
              {mode === "challenge" && "Admin Verification"}
              
              {mode === "error" && "Security check failed"}
            </h1>
            <p className="text-xs text-slate-500 truncate">{userEmail ?? "Admin account"}</p>
          </div>
        </div>

        {mode === "error" && (
          <div className="mt-5">
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 break-words">
              {error}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={refresh}
                className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={() => onSignOut()}
                className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-700"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        )}

        {mode === "enroll" && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              প্রথমবার setup করতে <b>Google Authenticator</b> (বা Authy / 1Password) দিয়ে এই QR code scan করুন।
            </p>
            {qr && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 grid place-items-center">
                <img src={qr} alt="TOTP QR code" className="w-48 h-48" />
              </div>
            )}
            {secret && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Manual setup key
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-[12px] font-mono text-slate-800 break-all flex-1">{secret}</code>
                  <button
                    onClick={copySecret}
                    className="shrink-0 h-8 w-8 grid place-items-center rounded-md border border-slate-200 hover:bg-white text-slate-600"
                    title="Copy"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <CodeInput
              code={code}
              setCode={setCode}
              onSubmit={handleVerifyTotp}
              submitting={submitting}
              error={error}
              label="Verify & Enable"
              autoFocus
            />
          </div>
        )}

        {mode === "challenge" && (
          <div className="mt-5">
            {settings?.allow_totp && settings?.allow_email_otp && (
              <div className="flex p-1 rounded-full bg-slate-100 text-sm">
                <button
                  onClick={() => { setTab("totp"); setError(null); setInfo(null); setCode(""); }}
                  className={`flex-1 h-9 rounded-full inline-flex items-center justify-center gap-1.5 font-medium transition ${
                    tab === "totp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Authenticator
                </button>
                <button
                  onClick={() => { setTab("email"); setError(null); setInfo(null); setCode(""); }}
                  className={`flex-1 h-9 rounded-full inline-flex items-center justify-center gap-1.5 font-medium transition ${
                    tab === "email" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email code
                </button>
              </div>
            )}

            {tab === "totp" && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {hasVerifiedFactor
                    ? "Authenticator app খুলে AccessNow BD Admin-এর জন্য দেখানো ৬-ডিজিটের কোডটি লিখুন।"
                    : "প্রথমে Authenticator setup করুন (Email tab-এ গিয়ে recovery code-ও নিতে পারেন)।"}
                </p>
                <CodeInput
                  code={code}
                  setCode={setCode}
                  onSubmit={handleVerifyTotp}
                  submitting={submitting}
                  error={error}
                  label="Verify"
                  autoFocus
                />
              </div>
            )}

            {tab === "email" && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Authenticator কাছে নেই? নিচের button-এ ক্লিক করুন — সব admin email-এ ৬-ডিজিটের code পাঠানো হবে।
                </p>
                <button
                  onClick={handleRequestEmail}
                  disabled={emailRequesting}
                  className="w-full h-11 rounded-full border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2"
                >
                  {emailRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {emailRequested ? "Resend code" : "Send code to admin emails"}
                </button>
                {info && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 break-words">
                    {info}
                  </p>
                )}
                {emailRequested && (
                  <CodeInput
                    code={code}
                    setCode={setCode}
                    onSubmit={handleVerifyEmail}
                    submitting={submitting}
                    error={error}
                    label="Verify email code"
                    autoFocus
                  />
                )}
                {!emailRequested && error && (
                  <p className="text-xs text-rose-600">{error}</p>
                )}
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Code-টি {emailRecipients || "সব"} admin email-এ যাবে এবং ১০ মিনিট valid থাকবে।
                </p>
              </div>
            )}
          </div>
        )}

        {(mode === "enroll" || mode === "challenge") && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => onSignOut()}
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
            <button
              onClick={refresh}
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeInput({
  code, setCode, onSubmit, submitting, error, label, autoFocus,
}: {
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <input
        autoFocus={autoFocus}
        inputMode="numeric"
        pattern="\d*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
        placeholder="000000"
        className="w-full h-14 text-center text-2xl tracking-[0.6em] font-mono font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 text-slate-900"
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <button
        onClick={onSubmit}
        disabled={submitting || code.length !== 6}
        className="mt-3 w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {label}
      </button>
    </div>
  );
}
