import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Crown, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { CartIcon } from "@/components/CartIcon";
import { AccountIcon } from "@/components/AccountIcon";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My Profile — AccessNow BD" }] }),
});

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  phone: z
    .string()
    .trim()
    .min(6, "Phone too short")
    .max(20, "Phone too long")
    .regex(/^[0-9+\-\s]+$/, "Only digits, +, - and spaces allowed"),
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [form, setForm] = useState({ display_name: "", phone: "" });
  const [errors, setErrors] = useState<{ display_name?: string; phone?: string; root?: string }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      rememberReturnTo();
      navigate({ to: "/login" });
      return;
    }
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setForm({
            display_name: data?.display_name ?? "",
            phone: data?.phone ?? "",
          });
          setLoading(false);
        });
    }
  }, [user, authLoading, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "display_name" | "phone";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...parsed.data }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      setErrors({ root: error.message });
      return;
    }
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-soft">
        <div className="mx-auto max-w-[1440px] px-4 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg" style={{ fontFamily: "var(--font-heading)" }}>
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-aurora text-white"><Crown className="w-4 h-4" /></span>
            AccessNow <span className="text-aurora">BD</span>
          </Link>
          <div className="flex items-center gap-1.5"><AccountIcon /><CartIcon /></div>
        </div>
      </header>

      <div className="mx-auto max-w-[700px] px-4 md:px-10 py-8">
        <Link to="/orders" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="glass-strong rounded-3xl p-6 md:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            My <span className="text-aurora">Profile</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Your full name"
                maxLength={100}
                className="mt-1.5 w-full h-12 px-4 rounded-full glass border-0 outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              {errors.display_name && <p className="text-xs text-[var(--color-destructive)] mt-1.5">{errors.display_name}</p>}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="01XXXXXXXXX"
                maxLength={20}
                className="mt-1.5 w-full h-12 px-4 rounded-full glass border-0 outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              {errors.phone && <p className="text-xs text-[var(--color-destructive)] mt-1.5">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="mt-1.5 w-full h-12 px-4 rounded-full glass-soft border-0 outline-none text-sm opacity-60 cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">Email can't be changed here.</p>
            </div>

            {errors.root && (
              <div className="rounded-xl bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] text-sm px-4 py-3">
                {errors.root}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-aurora text-white text-sm font-bold hover:opacity-95 disabled:opacity-60 transition glow-violet"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save changes"}
              </button>
              {savedAt && (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-success)] font-semibold">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
