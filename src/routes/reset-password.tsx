import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — AccessNow BD" }] }),
});

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const parsed = schema.safeParse({ password, confirm });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      setMsg("Password updated. Redirecting…");
      setTimeout(() => navigate({ to: "/orders" }), 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto max-w-md px-4 py-10">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500 }}>
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a new password for your account.
          </p>

          {ready && !hasSession ? (
            <p className="mt-5 text-sm text-destructive">
              This reset link is invalid or has expired. <Link to="/login" className="underline">Request a new one</Link>.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#333333]">New password <span className="text-destructive">*</span></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1.5 w-full h-[42px] px-4 rounded-md border border-border bg-white text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#333333]">Confirm password <span className="text-destructive">*</span></span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="mt-1.5 w-full h-[42px] px-4 rounded-md border border-border bg-white text-sm outline-none focus:border-primary"
                />
              </label>

              {err && <p className="text-sm text-destructive">{err}</p>}
              {msg && <p className="text-sm text-green-600">{msg}</p>}

              <button
                type="submit"
                disabled={busy || !ready}
                className="mt-2 w-full h-[48px] rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
