import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, EyeOff, X, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { sendTransactionalEmail } from "@/lib/email/send";
import accessNowLogo from "@/assets/logo-gold-a.webp";

export function AuthPageEntry({ initialMode, openForgot }: { initialMode: "login" | "signup"; openForgot?: boolean }) {
  return <AuthPage initialMode={initialMode} openForgot={openForgot} />;
}


const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(11, "Enter a valid phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

function AuthPage({ initialMode = "login", openForgot = false }: { initialMode?: "login" | "signup"; openForgot?: boolean } = {}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(openForgot);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);

  // Where to return after login. Priority:
  // 1. ?redirect=<path> search param (set by route guards / header links)
  // 2. sessionStorage "auth:returnTo" (set by callers right before navigating)
  // 3. document.referrer (same-origin, non-auth pages)
  // 4. "/"
  const [returnTo] = useState<string>(() => {
    if (typeof window === "undefined") return "/";
    const authPaths = ["/auth", "/login", "/register", "/forgot-password", "/reset-password"];
    const isSafe = (p: string) =>
      p.startsWith("/") && !p.startsWith("//") && !authPaths.some((a) => p === a || p.startsWith(a + "/") || p.startsWith(a + "?"));
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("redirect");
      if (fromQuery && isSafe(fromQuery)) return fromQuery;
    } catch { /* ignore */ }
    try {
      const stored = window.sessionStorage.getItem("auth:returnTo");
      if (stored && isSafe(stored)) {
        window.sessionStorage.removeItem("auth:returnTo");
        return stored;
      }
    } catch { /* ignore */ }
    try {
      const ref = document.referrer;
      if (!ref) return "/";
      const url = new URL(ref);
      if (url.origin !== window.location.origin) return "/";
      const path = url.pathname + url.search + url.hash;
      return isSafe(url.pathname) ? path : "/";
    } catch {
      return "/";
    }
  });


  useEffect(() => {
    setMode(initialMode);
    setErr(null);
  }, [initialMode]);

  useEffect(() => {
    if (!loading && user) navigate({ to: returnTo as string });
  }, [user, loading, navigate, returnTo]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const oauth = async (provider: "google" | "apple") => {
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${returnTo}` },
      });
      if (error) throw error;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Social sign-in failed");
    }
  };


  const sendReset = async () => {
    setForgotErr(null);
    setForgotMsg(null);
    setForgotBusy(true);
    try {
      const email = z.string().trim().email().max(255).parse(forgotEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotMsg("Check your email for a password reset link.");
    } catch (e: unknown) {
      setForgotErr(e instanceof Error ? e.message : "Failed to send reset email");
    } finally {
      setForgotBusy(false);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // Read values from the form so browser-autofilled values are always picked up
      const fd = new FormData(e.currentTarget);
      const values = {
        name: String(fd.get("name") || form.name || "").trim(),
        email: String(fd.get("email") || form.email || "").trim(),
        phone: String(fd.get("phone") || form.phone || "").trim(),
        password: String(fd.get("password") || form.password || ""),
      };
      if (mode === "signup") {
        if (!agree) throw new Error("Please agree to the Terms & Privacy Policy");
        const parsed = signupSchema.safeParse(values);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: parsed.data.name, phone: parsed.data.phone },
          },
        });
        if (error) throw error;
        // Fire-and-forget welcome email — only if a session exists (no email confirm).
        if (signUpData.session) {
          sendTransactionalEmail({
            templateName: "welcome",
            recipientEmail: parsed.data.email,
            idempotencyKey: `welcome-${signUpData.user?.id ?? parsed.data.email}`,
            templateData: {
              name: parsed.data.name?.split(" ")[0],
              dashboardUrl: `${window.location.origin}/dashboard`,
            },
          }).catch((err) => console.warn("Welcome email failed", err));
        }
      } else {
        const parsed = loginSchema.safeParse({ email: values.email, password: values.password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="dark-adapt min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-between py-6 px-4">
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] border border-slate-200/70 p-7 sm:p-9">
          {/* Close */}
          <Link
            to="/"
            aria-label="Close"
            className="absolute top-5 right-5 grid place-items-center w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </Link>

          {/* Brand logo */}
          <Link to="/" className="flex items-center justify-center mb-7 group">
            <img
              src={accessNowLogo}
              alt="AccessNow BD — Fast, Secure, Reliable"
              draggable={false}
              className="h-14 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Heading */}
          <h1 className="text-center font-extrabold text-slate-900 tracking-tight text-[32px] sm:text-[36px] leading-tight">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-center text-slate-500 text-[14px]">
            {isLogin ? "Please enter your detail to sign in." : "Sign up to get started with AccessNow BD."}
          </p>

          {/* Social buttons */}
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => oauth("google")}
              className="h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 hover:bg-white/55 active:bg-white/70 transition inline-flex items-center justify-center gap-2.5 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.35)]"
              aria-label="Continue with Google"
            >
              <svg viewBox="0 0 48 48" className="w-[18px] h-[18px]">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              <span className="text-[14px] font-semibold text-slate-800">Google</span>
            </button>
            <button
              type="button"
              onClick={() => oauth("apple")}
              className="h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 hover:bg-white/55 active:bg-white/70 transition inline-flex items-center justify-center gap-2.5 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.35)]"
              aria-label="Continue with Apple"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-slate-900" fill="currentColor">
                <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.01-.81.86-2.13 1.52-3.21 1.43-.14-1.09.42-2.24 1.13-2.97.79-.82 2.16-1.43 3.29-1.47zM20.5 17.06c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.52-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33C.04 15.97-.26 11.4 1.41 8.97c1.19-1.74 3.07-2.76 4.83-2.76 1.79 0 2.92 1 4.4 1 1.43 0 2.3-1 4.37-1 1.57 0 3.23.86 4.42 2.34-3.88 2.13-3.25 7.68-.93 8.51z" />
              </svg>
              <span className="text-[14px] font-semibold text-slate-900">Apple</span>
            </button>
          </div>

          {/* OR */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[12px] font-semibold text-slate-400 tracking-wider">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <>
                <Field
                  label="Full Name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  placeholder="আপনার পুরো নাম"
                  required
                />
                <Field
                  label="WhatsApp Number"
                  name="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </>
            )}

            <Field
              label="E-Mail Address"
              type="email"
              name="email"
              autoComplete={isLogin ? "username" : "email"}
              value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="Enter your email..."
              required
            />

            <Field
              label="Password"
              type={showPw ? "text" : "password"}
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={form.password}
              onChange={(v) => update("password", v)}
              placeholder="Password@123"
              required
              trailing={
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPw((v) => !v)}
                  className="grid place-items-center w-9 h-9 rounded-full text-white bg-[#7C5CFF] hover:bg-[#6B4BFF] active:bg-[#5A3FE6] transition shadow-[0_4px_12px_-4px_rgba(124,92,255,0.55)]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {isLogin ? (
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700 cursor-pointer select-none">
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      setRemember((v) => !v);
                    }}
                    className={`grid place-items-center h-[18px] w-[18px] rounded-[5px] border transition ${
                      remember ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300"
                    }`}
                  >
                    {remember && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2.5 6.5 5 9 9.5 3.5" />
                      </svg>
                    )}
                  </span>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen((v) => !v);
                    setForgotErr(null);
                    setForgotMsg(null);
                    setForgotEmail(form.email);
                  }}
                  className="text-[13px] font-bold text-slate-900 hover:text-[#2f6dff] transition"
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex items-start gap-2 text-[13px] text-slate-600 cursor-pointer select-none">
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    setAgree((v) => !v);
                  }}
                  className={`mt-0.5 grid place-items-center h-[18px] w-[18px] rounded-[5px] border transition shrink-0 ${
                    agree ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300"
                  }`}
                >
                  {agree && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2.5 6.5 5 9 9.5 3.5" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="sr-only" />
                <span>
                  I agree to the <span className="font-bold text-slate-900">Terms</span> &{" "}
                  <span className="font-bold text-slate-900">Privacy Policy</span>
                </span>
              </label>
            )}

            {err && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-13 py-3.5 rounded-full bg-[#0c1322] hover:bg-[#1a2238] text-white text-[15px] font-bold transition shadow-[0_8px_24px_-10px_rgba(12,19,34,0.6)] inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? "Sign in" : "Create account"}
            </button>

            {isLogin && forgotOpen && (
              <div className="mt-1 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <p className="text-[13px] font-bold text-slate-900">Reset your password</p>
                <Field
                  label="Email"
                  type="email"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  placeholder="you@example.com"
                  required
                />
                {forgotErr && <p className="text-[12px] font-semibold text-rose-600">{forgotErr}</p>}
                {forgotMsg && (
                  <p className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {forgotMsg}
                  </p>
                )}
                <button
                  type="button"
                  onClick={sendReset}
                  disabled={forgotBusy}
                  className="w-full h-11 rounded-full bg-white border border-slate-300 text-[13px] font-bold text-slate-900 hover:bg-slate-100 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {forgotBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send reset link
                </button>
              </div>
            )}

            <p className="text-center text-[13.5px] text-slate-500 pt-2">
              {isLogin ? (
                <>
                  Don't have an account yet?{" "}
                  <Link
                    to="/register"
                    onClick={() => {
                      setMode("signup");
                      setErr(null);
                    }}
                    className="font-bold text-slate-900 hover:text-[#2f6dff] transition"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    onClick={() => {
                      setMode("login");
                      setErr(null);
                    }}
                    className="font-bold text-slate-900 hover:text-[#2f6dff] transition"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-[12.5px] text-slate-400">
        © {year} AccessNow BD
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  trailing,
  name,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  trailing?: React.ReactNode;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <div className="block">
      <span className="text-[13.5px] font-bold text-slate-900 block">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="mt-2 relative">
        <input
          type={type}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={`w-full h-12 px-5 ${trailing ? "pr-14" : ""} rounded-full bg-white border border-slate-200 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition`}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">{trailing}</span>
        )}
      </div>
    </div>
  );
}
