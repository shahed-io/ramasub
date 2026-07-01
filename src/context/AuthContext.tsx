import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });
const AUTH_BOOT_TIMEOUT_MS = 5000;

async function withAuthTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Auth boot timed out")), AUTH_BOOT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Read persisted Supabase session synchronously from localStorage so the
// first render already has a user object — eliminates the "loading flash"
// for signed-in users (admin shell, dashboards, etc).
function readPersistedSession(): Session | null {
  if (typeof localStorage === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const sess = (parsed?.currentSession ?? parsed) as Session | null;
      if (sess && typeof sess === "object" && sess.access_token && sess.user) {
        const expMs = (sess.expires_at ?? 0) * 1000;
        if (!expMs || expMs > Date.now()) return sess;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = typeof window !== "undefined" ? readPersistedSession() : null;
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(!initialSession);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN" && s?.user) {
        const meta = (s.user.user_metadata ?? {}) as Record<string, any>;
        const identities = (s.user.identities ?? []) as Array<{ provider?: string; identity_data?: Record<string, any> }>;
        const googleIdentity = identities.find((i) => i.provider === "google");
        const gmeta = { ...(googleIdentity?.identity_data ?? {}), ...meta } as Record<string, any>;

        const avatar = gmeta.avatar_url || gmeta.picture || gmeta.avatar || null;
        const name = gmeta.full_name || gmeta.name ||
          [gmeta.given_name, gmeta.family_name].filter(Boolean).join(" ") || null;
        const phone = s.user.phone || gmeta.phone_number || gmeta.phone || null;

        // Smart sync: fill empty profile fields with Google data, and always refresh
        // the Google avatar so profile pictures updated in Google reflect here too.
        setTimeout(async () => {
          try {
            const { data: existing } = await supabase
              .from("profiles")
              .select("id, display_name, phone, avatar_url")
              .eq("id", s.user.id)
              .maybeSingle();

            const patch: Record<string, any> = { id: s.user.id };
            // Avatar: always refresh from Google (source of truth for OAuth users)
            if (avatar) patch.avatar_url = avatar;
            // Name / phone: only fill when profile has none, so we don't clobber user edits
            if (name && !existing?.display_name) patch.display_name = name;
            if (phone && !existing?.phone) patch.phone = phone;

            if (Object.keys(patch).length > 1) {
              await supabase.from("profiles").upsert(patch, { onConflict: "id" });
            }
          } catch { /* ignore */ }
        }, 0);

        // Telegram: fire for brand-new signups (user created <60s ago), guarded per-user in sessionStorage.
        try {
          const createdAt = s.user.created_at ? new Date(s.user.created_at).getTime() : 0;
          const isFresh = createdAt && Date.now() - createdAt < 60_000;
          const key = `tg_signup_${s.user.id}`;
          if (isFresh && typeof sessionStorage !== "undefined" && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            import("@/lib/telegram").then(({ notifyTelegram }) => {
              notifyTelegram({
                event: "new_signup",
                title: "নতুন User Signup",
                lines: [
                  ["Name", name ?? "—"],
                  ["Email", s.user.email ?? "—"],
                  ["Provider", gmeta.provider ?? (googleIdentity ? "google" : "email")],
                ],
              });
            });
          }
        } catch { /* ignore */ }
      }

    });
    withAuthTimeout(supabase.auth.getSession())
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);


  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
