import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AuthPageEntry } from "@/components/AuthPage";
import {
  ShieldAlert, LogOut, Globe,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ExternalLink, Menu, Search, X,
  Home, Frown, ShoppingCart, Sun, Bell, Sparkles,
} from "lucide-react";


import { AdminGlobalSearch, useAdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { SearchTrigger } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_MENU, type AdminMenuItem } from "@/lib/admin-menu";
import { AdminMfaGate } from "@/components/admin/AdminMfaGate";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminLangProvider, useAdminLang } from "@/context/AdminLangContext";
import { BrandLogo } from "@/components/BrandLogo";
import ramaSubLogoAsset from "@/assets/rama-logo-new.png.asset.json";
const ramaSubLogo = ramaSubLogoAsset.url;

export const Route = createFileRoute("/Mahbub214")({
  component: AdminLayout,
  // Admin panel is noindex + client-only; skip SSR so we can read cached admin
  // flag from localStorage on first render and open instantly on click.
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Rama Sub" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const ADMIN_CACHE_KEY = "anbd:isAdmin";
const ADMIN_ROLE_CHECK_TIMEOUT_MS = 8000;

async function withAdminTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Admin permission check timed out")), ADMIN_ROLE_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Legacy splash/loader cache keys written by earlier versions.
const LEGACY_SPLASH_KEYS = [
  "anbd:adminSplashSeen",
  "anbd:adminBoot",
  "anbd:adminBootSplash",
  "anbd:splash",
  "anbd:bootSplash",
  "adminSplash",
  "admin:splash",
];

function purgeLegacySplashFlags() {
  if (typeof localStorage === "undefined") return;
  for (const k of LEGACY_SPLASH_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
    try { sessionStorage.removeItem(k); } catch { /* ignore */ }
  }
}

function readCachedAdmin(): boolean {
  if (typeof localStorage === "undefined") return false;
  try { return localStorage.getItem(ADMIN_CACHE_KEY) === "1"; } catch { return false; }
}

function AdminLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [cachedAdmin, setCachedAdmin] = useState<boolean>(() => readCachedAdmin());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => readCachedAdmin());
  const [verified, setVerified] = useState<boolean>(() => readCachedAdmin());
  const [roleError, setRoleError] = useState<{
    message: string;
    code?: string;
    details?: string;
    hint?: string;
    raw?: unknown;
  } | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    purgeLegacySplashFlags();
  }, []);

  // Admin panel uses its own design system — force theme-white on <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const hadWhite = root.classList.contains("theme-white");
    root.classList.add("theme-white");
    return () => { if (!hadWhite) root.classList.remove("theme-white"); };
  }, []);

  const verifyRole = useMemo(
    () => async (uid: string) => {
      setRoleError(null);
      try {
        const { data, error } = await withAdminTimeout(
          supabase.rpc("has_role", {
            _user_id: uid,
            _role: "admin",
          }),
        );
        setCheckedAt(new Date().toISOString());
        if (error) {
          setRoleError({
            message: error.message || "Unknown RPC error",
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
            raw: error,
          });
          setIsAdmin(false);
          return;
        }
        if (data !== true) {
          setRoleError({
            message: `has_role returned ${JSON.stringify(data)} (expected true). Your account is not assigned the 'admin' role in user_roles.`,
          });
        }
        const ok = data === true;
        setIsAdmin(ok);
        try {
          if (ok) localStorage.setItem(ADMIN_CACHE_KEY, "1");
          else localStorage.removeItem(ADMIN_CACHE_KEY);
        } catch { /* ignore */ }
      } catch (e: any) {
        setCheckedAt(new Date().toISOString());
        setRoleError({
          message: e?.message || "Network/unknown error calling has_role",
          raw: e,
        });
        setIsAdmin(false);
        try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* ignore */ }
      }
    },
    [],
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch {}
      return;
    }
    let cancelled = false;
    (async () => {
      await verifyRole(user.id);
      if (cancelled) return;
      setVerified(true);
    })();
    return () => { cancelled = true; };
  }, [user, loading, verifyRole]);

  if (loading && !cachedAdmin) {
    return <AdminBlankState />;
  }

  if (!loading && !user) {
    return <AuthPageEntry initialMode="login" />;
  }

  if (!verified && !cachedAdmin) {
    return <AdminBlankState />;
  }

  if (!isAdmin && verified) {
    return (
      <div className="min-h-screen grid place-items-center px-4 py-10 relative overflow-hidden" style={{ background: "#EDF2F7" }}>
        {/* Soft clay background blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-60 blur-3xl" style={{ background: "#FEE2E2" }} />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-60 blur-3xl" style={{ background: "#E0E7FF" }} />

        <div
          className="max-w-md w-full rounded-[32px] p-8 sm:p-10 text-center relative z-10"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(255, 255, 255, 0.95)",
            boxShadow: "12px 16px 36px rgba(160, 175, 200, 0.3), -8px -8px 24px rgba(255, 255, 255, 0.95), inset 2.5px 2.5px 5px rgba(255, 255, 255, 0.9), inset -2.5px -2.5px 5px rgba(175, 190, 215, 0.2)",
          }}
        >
          <div
            className="mx-auto w-16 h-16 rounded-full grid place-items-center mb-5 text-white"
            style={{
              background: "linear-gradient(135deg, #F87171 0%, #DC2626 100%)",
              boxShadow: "6px 8px 18px rgba(220, 38, 38, 0.35), inset 2px 2px 3px rgba(255, 255, 255, 0.5)",
              border: "2px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1E293B", fontFamily: "'Poppins', sans-serif" }}>Access Denied</h1>
          <p className="text-sm mt-2 font-medium" style={{ color: "#64748B" }}>
            আপনার এই অ্যাডমিন পেজ দেখার অনুমতি নেই।
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="h-11 px-6 inline-flex items-center rounded-full text-sm font-bold transition-all hover:opacity-90"
              style={{
                background: "#FFFFFF",
                color: "#1E293B",
                border: "1.5px solid rgba(255, 255, 255, 0.95)",
                boxShadow: "4px 6px 14px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
              }}
            >
              Home
            </Link>
            <button
              onClick={async () => {
                try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch {}
                await signOut();
                navigate({ to: "/login" });
              }}
              className="h-11 px-6 inline-flex items-center gap-2 rounded-full text-white text-sm font-bold transition-all hover:opacity-95"
              style={{
                background: "linear-gradient(135deg, #7C66FF 0%, #5B48E8 100%)",
                boxShadow: "5px 8px 18px rgba(108, 92, 231, 0.4), inset 2px 2px 3px rgba(255, 255, 255, 0.5)",
                border: "1.5px solid rgba(255, 255, 255, 0.4)",
              }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLangProvider>
      <AdminMfaGate
        userEmail={user?.email}
        onSignOut={async () => {
          try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* ignore */ }
          await signOut();
          navigate({ to: "/login" });
        }}
      >
        <AdminShell user={user} signOut={signOut} navigate={navigate} />
      </AdminMfaGate>
    </AdminLangProvider>
  );
}

function AdminBlankState() {
  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden" style={{ background: "#EDF2F7" }} role="status" aria-label="Loading admin panel">
      {/* Soft clay background blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-60 blur-3xl" style={{ background: "#D8CEFD" }} />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-60 blur-3xl" style={{ background: "#CDE3FE" }} />

      <div
        className="rounded-[32px] p-8 sm:p-10 flex flex-col items-center gap-5 relative z-10 max-w-sm w-full mx-4 text-center"
        style={{
          background: "#FFFFFF",
          border: "1.5px solid rgba(255, 255, 255, 0.95)",
          boxShadow: "12px 16px 36px rgba(160, 175, 200, 0.28), -8px -8px 24px rgba(255, 255, 255, 0.95), inset 2.5px 2.5px 5px rgba(255, 255, 255, 0.9), inset -2.5px -2.5px 5px rgba(175, 190, 215, 0.2)",
        }}
      >
        {/* Logo in 3D clay bubble */}
        <div className="relative w-20 h-20">
          <div className="admin-loader-ring" />
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center text-white"
              style={{
                background: "linear-gradient(135deg, #7C66FF 0%, #5B48E8 100%)",
                boxShadow: "6px 8px 18px rgba(108, 92, 231, 0.4), -3px -3px 8px rgba(255, 255, 255, 0.9), inset 2px 2px 3px rgba(255, 255, 255, 0.5)",
                border: "1.5px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <img
                src={ramaSubLogo}
                alt=""
                className="w-8 h-8 object-contain admin-loader-logo"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* Animated text */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-base font-black tracking-tight" style={{ color: "#1E293B", fontFamily: "'Poppins', sans-serif" }}>Rama Sub</span>
          <span className="text-xs font-semibold tracking-wide" style={{ color: "#64748B" }}>Loading Clay Dashboard…</span>
        </div>

        {/* Animated clay progress bars */}
        <div className="flex items-center gap-2">
          <span className="admin-loader-bar" style={{ animationDelay: "0ms", background: "linear-gradient(to top, #7C66FF, #A29BFE)" }} />
          <span className="admin-loader-bar" style={{ animationDelay: "150ms", background: "linear-gradient(to top, #7C66FF, #A29BFE)" }} />
          <span className="admin-loader-bar" style={{ animationDelay: "300ms", background: "linear-gradient(to top, #7C66FF, #A29BFE)" }} />
        </div>
      </div>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "#F6F7FB" }}>
      <div className="max-w-md w-full text-center">
        <div className="relative mx-auto w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full blur-xl opacity-70" style={{ background: "linear-gradient(135deg, #EEE9FF, #6D4AFF33)" }} />
          <div
            className="relative w-full h-full rounded-full grid place-items-center"
            style={{ background: "#fff", border: "1px solid #E4E7EF", boxShadow: "0 8px 32px rgba(109,74,255,0.12)" }}
          >
            <Frown className="w-14 h-14" style={{ color: "#DC2626" }} strokeWidth={1.6} />
          </div>
        </div>
        <div
          className="text-[80px] leading-none font-black tracking-tight bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(90deg, #6D4AFF 0%, #4f46e5 50%, #DC2626 100%)" }}
        >
          404
        </div>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: "#15192C" }}>Page Not Found</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#667085" }}>
          দুঃখিত! আপনি যে পেজটি খুঁজছেন সেটি খুঁজে পাওয়া যায়নি।
        </p>
        <div className="mt-7 flex items-center justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)", boxShadow: "0 8px 24px rgba(109,74,255,0.35)" }}
          >
            <Home className="w-4 h-4" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}


function AdminShell({ user, signOut, navigate }: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { open: globalOpen, setOpen: setGlobalOpen } = useAdminGlobalSearch();
  const { lang, toggle, t } = useAdminLang();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return ADMIN_MENU;
    const q = search.toLowerCase();
    return ADMIN_MENU.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (i.labelBn ?? "").toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  const currentPage = useMemo(() => {
    for (const g of ADMIN_MENU) {
      const item = g.items.find((i) => i.to === pathname);
      if (item) return { group: g, item };
    }
    return null;
  }, [pathname]);

  return (
    <div
      className="admin-shell min-h-[100dvh] w-full overflow-x-hidden lg:h-[100dvh] lg:overflow-hidden flex relative font-['Inter',ui-sans-serif,system-ui]"
      style={{ background: "#EDF2F7", color: "#1E293B" }}
    >
      {/* Ambient soft pastel clay spheres floating in background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-65 blur-[100px]"
          style={{ background: "radial-gradient(circle, #D8CEFD 0%, rgba(216,206,253,0) 70%)" }}
        />
        <div
          className="absolute top-1/4 -right-32 w-[650px] h-[650px] rounded-full opacity-55 blur-[110px]"
          style={{ background: "radial-gradient(circle, #CDE3FE 0%, rgba(205,227,254,0) 70%)" }}
        />
        <div
          className="absolute -bottom-48 left-1/3 w-[650px] h-[650px] rounded-full opacity-50 blur-[120px]"
          style={{ background: "radial-gradient(circle, #D1F6E4 0%, rgba(209,246,228,0) 70%)" }}
        />
        <div
          className="absolute bottom-20 -left-20 w-[450px] h-[450px] rounded-full opacity-45 blur-[90px]"
          style={{ background: "radial-gradient(circle, #FEE5D4 0%, rgba(254,229,212,0) 70%)" }}
        />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm"
          style={{ background: "rgba(15,23,42,0.3)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── SIDEBAR (Clay Card Panel) ─── */}
      <aside
        className={[
          "shrink-0 transition-all duration-300 ease-in-out flex flex-col h-[100dvh] max-h-[100dvh] lg:relative",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:z-10",
          collapsed ? "lg:w-[82px]" : "lg:w-[276px]",
          "fixed top-0 left-0 z-50 w-[min(22rem,92vw)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{
          background: "#FFFFFF",
          borderRight: "1.5px solid rgba(255,255,255,0.95)",
          boxShadow: "10px 0 32px rgba(160, 175, 200, 0.22), inset -2px 0 4px rgba(175, 190, 215, 0.12)",
        }}
      >
        {/* Top clay accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, #7C66FF, #5B48E8, #7C66FF)" }}
        />

        {/* Brand */}
        <div
          className={[
            collapsed
              ? "flex flex-col items-center justify-center gap-1.5 py-5 px-2"
              : "h-[74px] flex items-center justify-between px-4",
          ].join(" ")}
          style={{ borderBottom: "1.5px solid #EDF2F7" }}
        >
          <Link to="/Mahbub214" className={`flex items-center gap-3 min-w-0 group ${collapsed ? "justify-center" : ""}`} aria-label="Rama Sub Admin">
            <div
              className="w-10 h-10 rounded-2xl grid place-items-center text-white shrink-0 group-hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(135deg, #7C66FF 0%, #5B48E8 100%)",
                boxShadow: "4px 6px 14px rgba(108, 92, 231, 0.38), -2px -2px 6px rgba(255, 255, 255, 0.9), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.5), inset -1.5px -1.5px 3px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={2.4} />
            </div>
            {!collapsed && (
              <span className="leading-tight min-w-0">
                <span
                  className="block text-[16px] font-black tracking-tight"
                  style={{
                    fontFamily: "'Poppins', var(--font-heading)",
                    color: "#1E293B",
                  }}
                >
                  Rama Sub
                </span>
                <span
                  className="block text-[9.5px] font-extrabold uppercase tracking-[0.2em] mt-0.5"
                  style={{ color: "#6C5CE7" }}
                >
                  Clay Dashboard
                </span>
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-xl transition hover:opacity-80 text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={[
              "hidden lg:inline-flex items-center justify-center rounded-xl transition",
              collapsed ? "w-9 h-9" : "w-8 h-8",
            ].join(" ")}
            style={{
              color: "#64748B",
              background: collapsed ? "#EEF2F6" : "transparent",
              border: collapsed ? "1px solid #E2E8F0" : "none",
            }}
            aria-label={collapsed ? t("Expand sidebar", "সাইডবার বড় করুন") : t("Collapse sidebar", "সাইডবার ছোট করুন")}
            title={collapsed ? t("Expand sidebar", "সাইডবার বড় করুন") : t("Collapse sidebar", "সাইডবার ছোট করুন")}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Trigger (Debossed Clay Inset) */}
        {!collapsed && (
          <div className="px-3 pt-3.5 pb-1">
            <button
              type="button"
              onClick={() => setGlobalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition"
              style={{
                background: "#F4F7FB",
                border: "1.5px solid rgba(215, 225, 238, 0.8)",
                color: "#64748B",
                boxShadow: "inset 3px 3px 6px rgba(160, 175, 200, 0.22), inset -3px -3px 6px rgba(255, 255, 255, 0.95)",
              }}
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{t("Search cars, orders, users…", "সার্চ করুন…")}</span>
              </span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-500 shadow-sm shrink-0">Ctrl K</kbd>
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 admin-scroll space-y-1">
          {filteredMenu.map((group) => (
            <SidebarGroup key={group.id} group={group} collapsed={collapsed} pathname={pathname} />
          ))}
        </nav>


        {/* User Footer (Clay Pill Card) */}
        <div
          className="p-3"
          style={{ borderTop: "1.5px solid #EDF2F7", background: "#FFFFFF" }}
        >
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-xs font-black shrink-0 text-white"
              style={{
                background: "linear-gradient(135deg, #7C66FF 0%, #5B48E8 100%)",
                boxShadow: "3px 4px 10px rgba(108, 92, 231, 0.35), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.5)",
                border: "1.5px solid rgba(255,255,255,0.7)",
              }}
            >
              {(user?.email ?? "A").slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate text-slate-900">{t("Admin", "অ্যাডমিন")}</div>
                <div className="text-[11px] truncate text-slate-500">{user?.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
                className="shrink-0 w-8 h-8 rounded-full grid place-items-center transition text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                style={{
                  boxShadow: "2px 2px 5px rgba(160, 175, 200, 0.15), inset 1px 1px 2px rgba(255, 255, 255, 0.8)",
                }}
                title={t("Logout", "লগআউট")}
                aria-label={t("Logout", "লগআউট")}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 min-w-0 w-full flex flex-col lg:h-[100dvh] lg:overflow-y-auto relative z-[1]">

        {/* ─── TOP BAR (Claymorphic Header Bar) ─── */}
        <header
          className="h-[72px] sticky top-0 z-20"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(20px)",
            borderBottom: "1.5px solid rgba(255, 255, 255, 0.95)",
            boxShadow: "0 6px 20px rgba(160, 175, 200, 0.12)",
          }}
        >
          <div className="h-full px-3 md:px-6 flex items-center gap-2 md:gap-4 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-10 w-10 rounded-2xl grid place-items-center transition text-slate-700"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid rgba(255, 255, 255, 0.95)",
                boxShadow: "4px 5px 12px rgba(160, 175, 200, 0.22), -2px -2px 6px rgba(255, 255, 255, 0.95)",
              }}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb / Section info */}
            <div className="hidden md:flex flex-col justify-center min-w-0 h-full py-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-slate-400">
                <span>
                  {currentPage
                    ? t(currentPage.group.title, currentPage.group.titleBn)
                    : t(ADMIN_MENU[0].title, ADMIN_MENU[0].titleBn)}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-[#6C5CE7]">
                  {currentPage
                    ? t(currentPage.item.label, currentPage.item.labelBn)
                    : t("Dashboard", "ড্যাশবোর্ড")}
                </span>
              </div>
              <div
                className="font-black text-[18px] leading-tight mt-0.5 truncate text-slate-900"
                style={{ fontFamily: "'Poppins', var(--font-heading)" }}
              >
                {currentPage
                  ? t(currentPage.item.label, currentPage.item.labelBn)
                  : t("Dashboard", "ড্যাশবোর্ড")}
              </div>
            </div>

            <div className="md:hidden flex-1 min-w-0 font-bold text-sm truncate text-slate-900">
              {currentPage
                ? t(currentPage.item.label, currentPage.item.labelBn)
                : t("Dashboard", "ড্যাশবোর্ড")}
            </div>

            {/* Center: Clay Search Bar (matching reference image) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setGlobalOpen(true)}
                className="w-full flex items-center justify-between h-11 px-4 rounded-full text-xs font-semibold text-slate-500 transition"
                style={{
                  background: "#F4F7FB",
                  border: "1.5px solid rgba(215, 225, 238, 0.8)",
                  boxShadow: "inset 3px 3px 6px rgba(160, 175, 200, 0.22), inset -3px -3px 6px rgba(255, 255, 255, 0.95)",
                }}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{t("Search cars, customers, orders…", "সার্চ করুন কাস্টমার, অর্ডার, কার...")}</span>
                </span>
                <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shadow-sm shrink-0">
                  Ctrl K
                </kbd>
              </button>
            </div>

            <div className="lg:hidden flex-1" />

            {/* Right Action Icons (Clay Bubbles & Pills) */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Sun/Theme toggle bubble */}
              <button
                type="button"
                className="w-9 h-9 rounded-full grid place-items-center transition text-amber-500"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "4px 5px 12px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
                }}
                title={t("Light theme active", "লাইট থিম সক্রিয়")}
                aria-label="Theme"
              >
                <Sun className="w-4 h-4" />
              </button>

              {/* Notification bell bubble */}
              <Link
                to="/Mahbub214/orders"
                className="relative w-9 h-9 rounded-full grid place-items-center transition text-slate-600 hover:text-indigo-600"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "4px 5px 12px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
                }}
                title={t("Notifications", "নোটিফিকেশন")}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span
                  className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white"
                  style={{ background: "#EF4444" }}
                />
              </Link>

              {/* Language toggle pill */}
              <button
                type="button"
                onClick={toggle}
                aria-label={t("Switch to Bangla", "ইংরেজিতে পরিবর্তন")}
                title={lang === "en" ? "বাংলায় দেখুন" : "Show in English"}
                className="inline-flex h-9 px-3 rounded-full text-xs font-bold items-center gap-1.5 transition text-slate-700"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "4px 5px 12px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
                }}
              >
                <Globe className="w-3.5 h-3.5 text-[#6C5CE7]" /> {lang === "en" ? "বাং" : "EN"}
              </button>

              {/* Store preview pill */}
              <Link
                to="/"
                className="hidden sm:inline-flex h-9 px-3.5 rounded-full text-xs font-bold items-center gap-1.5 transition text-[#6C5CE7] hover:opacity-90"
                style={{
                  background: "#EEF2FF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "4px 5px 12px rgba(108, 92, 231, 0.18), -2px -2px 6px rgba(255, 255, 255, 0.95)",
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> {t("Store", "স্টোর")}
              </Link>

              {/* Admin profile pill (matching image header) */}
              <div
                className="hidden sm:flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full text-xs font-bold text-slate-800"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: "4px 5px 12px rgba(160, 175, 200, 0.22), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.8)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-black text-white shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #7C66FF 0%, #5B48E8 100%)",
                    boxShadow: "1px 2px 4px rgba(108, 92, 231, 0.4)",
                  }}
                >
                  {(user?.email ?? "A").slice(0, 1).toUpperCase()}
                </div>
                <span className="truncate max-w-[90px]">Admin</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-3.5 sm:p-6 md:p-8 min-w-0 w-full overflow-x-hidden" style={{ color: "#1E293B" }}>
          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            <AdminPageHeader />
            <Outlet />
          </div>
        </div>

      </div>

      <AdminGlobalSearch open={globalOpen} onOpenChange={setGlobalOpen} />

      <style>{`
        /* ── Scrollbar ── */
        .admin-scroll::-webkit-scrollbar { width: 4px; }
        .admin-scroll::-webkit-scrollbar-thumb { background: rgba(109,74,255,0.18); border-radius: 999px; }
        .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(109,74,255,0.32); }

        /* ── Ripple ── */
        @keyframes adminRipple { to { transform: translate(-50%,-50%) scale(18); opacity: 0; } }

        /* ── Loader ring ── */
        @keyframes adminRingPulse { to { transform: rotate(360deg); } }
        .admin-loader-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #6D4AFF; border-right-color: #4f46e5;
          animation: adminRingPulse 0.9s linear infinite;
        }

        /* ── Loader logo float ── */
        @keyframes adminLogoFloat { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .admin-loader-logo { animation: adminLogoFloat 2s ease-in-out infinite; }

        /* ── Loader bars ── */
        @keyframes adminBarPulse { 0%,100% { transform: scaleY(0.55); opacity: .45; } 50% { transform: scaleY(1.2); opacity: 1; } }
        .admin-loader-bar {
          display: inline-block; width: 4px; height: 22px; border-radius: 999px;
          background: linear-gradient(to top, #6D4AFF, #818cf8);
          animation: adminBarPulse 0.85s ease-in-out infinite;
        }

        /* ── Sidebar item active pulse ── */
        @keyframes adminActivePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ── Card hover lift ── */
        .admin-card-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .admin-card-lift:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

function SidebarGroup({ group, collapsed, pathname }: { group: any; collapsed: boolean; pathname: string }) {
  const hasActive = group.items.some((i: AdminMenuItem) => pathname === i.to);
  const [open, setOpen] = useState<boolean>(true);
  const { t } = useAdminLang();

  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  if (collapsed) {
    return (
      <div className="py-2 last:border-0" style={{ borderBottom: "1px solid rgba(228,231,239,0.5)" }}>
        {group.items.map((item: AdminMenuItem) => (
          <SidebarItem key={item.to} item={item} collapsed active={pathname === item.to} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 first:mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] transition hover:opacity-80"
        style={{ color: "#667085" }}
      >
        <span>{t(group.title, group.titleBn)}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          style={{ color: "#B4B8CC" }}
        />
      </button>
      {open && (
        <div className="space-y-0.5 mt-1">
          {group.items.map((item: AdminMenuItem) => (
            <SidebarItem key={item.to} item={item} active={pathname === item.to} />
          ))}
        </div>
      )}
    </div>
  );
}

const ADMIN_ICON_COLORS: Record<string, string> = {
  "amber-400": "#f59e0b",
  "amber-500": "#d97706",
  "blue-400": "#60a5fa",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  "blue-800": "#1e40af",
  "cyan-400": "#22d3ee",
  "cyan-500": "#06b6d4",
  "emerald-500": "#059669",
  "emerald-600": "#047857",
  "green-500": "#16a34a",
  "green-600": "#15803d",
  "indigo-400": "#818cf8",
  "indigo-500": "#6366f1",
  "indigo-600": "#4f46e5",
  "indigo-700": "#4338ca",
  "indigo-800": "#3730a3",
  "orange-400": "#f97316",
  "orange-500": "#ea580c",
  "orange-600": "#c2410c",
  "pink-500": "#db2777",
  "pink-600": "#be185d",
  "red-500": "#dc2626",
  "red-600": "#b91c1c",
  "red-700": "#991b1b",
  "rose-500": "#e11d48",
  "rose-600": "#be123c",
  "sky-400": "#38bdf8",
  "sky-500": "#0ea5e9",
  "sky-600": "#0284c7",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "teal-500": "#14b8a6",
  "teal-600": "#0d9488",
  "teal-700": "#0f766e",
  "violet-400": "#a78bfa",
  "violet-500": "#8b5cf6",
  "violet-600": "#7c3aed",
  "violet-700": "#6d28d9",
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "purple-600": "#9333ea",
  "purple-700": "#7e22ce",
  "fuchsia-400": "#e879f9",
  "fuchsia-500": "#d946ef",
  "fuchsia-600": "#c026d3",
  "emerald-400": "#34d399",
  "emerald-700": "#065f46",
  "amber-600": "#b45309",
  "pink-400": "#f472b6",
  "rose-400": "#fb7185",
  "indigo-300": "#a5b4fc",
  "cyan-600": "#0891b2",
  "yellow-500": "#ca8a04",
};


function iconGradientStyle(grad: string): CSSProperties {
  const from = /from-([\w-]+)/.exec(grad)?.[1] ?? "violet-600";
  const to = /to-([\w-]+)/.exec(grad)?.[1] ?? "indigo-600";
  return {
    backgroundImage: `linear-gradient(135deg, ${ADMIN_ICON_COLORS[from] ?? "#6D4AFF"} 0%, ${ADMIN_ICON_COLORS[to] ?? "#4f46e5"} 100%)`,
  };
}

function SidebarItem({ item, collapsed, active }: { item: AdminMenuItem; collapsed?: boolean; active: boolean }) {
  const { t } = useAdminLang();
  const label = t(item.label, item.labelBn);
  const [hovered, setHovered] = useState(false);

  const badgeStyle =
    item.badge === "LIVE"
      ? { background: "#EF4444", color: "#ffffff", boxShadow: "2px 3px 6px rgba(239,68,68,0.3)" }
      : item.badge === "NEW"
        ? { background: "#6C5CE7", color: "#ffffff", boxShadow: "2px 3px 6px rgba(108,92,231,0.3)" }
        : { background: "#F59E0B", color: "#ffffff", boxShadow: "2px 3px 6px rgba(245,158,11,0.3)" };

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "group relative flex items-center gap-3 rounded-[20px] text-sm overflow-hidden",
        "transition-all duration-200 ease-out",
        "active:scale-[0.97]",
        collapsed ? "justify-center px-2 py-2.5 mx-1 my-1" : "px-3 py-2.5 my-0.5",
      ].join(" ")}
      style={active ? {
        background: "#FFFFFF",
        boxShadow: "5px 7px 16px rgba(160, 175, 200, 0.28), -3px -3px 8px rgba(255, 255, 255, 0.95), inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -2px -2px 3px rgba(175, 190, 215, 0.18)",
        color: "#1E293B",
        fontWeight: 700,
        border: "1.5px solid rgba(255, 255, 255, 1)",
      } : hovered ? {
        background: "#F8FAFD",
        color: "#1E293B",
        border: "1.5px solid rgba(255, 255, 255, 0.8)",
        boxShadow: "3px 4px 10px rgba(160, 175, 200, 0.15), -2px -2px 6px rgba(255, 255, 255, 0.8)",
      } : {
        color: "#64748B",
        border: "1.5px solid transparent",
      }}
    >
      {/* 3D Clay Icon Bubble */}
      <span
        style={{
          ...iconGradientStyle(item.grad),
          boxShadow: active
            ? "4px 6px 14px rgba(108, 92, 231, 0.38), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.6), inset -1.5px -1.5px 2px rgba(0, 0, 0, 0.15)"
            : "2px 3px 8px rgba(160, 175, 200, 0.22), inset 1px 1px 2px rgba(255, 255, 255, 0.45)",
          border: "1.5px solid rgba(255, 255, 255, 0.65)",
        }}
        className={[
          "shrink-0 w-8 h-8 rounded-full grid place-items-center text-white",
          "transition-transform duration-200",
          active ? "scale-105" : "group-hover:scale-105",
        ].join(" ")}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span
          className="relative truncate flex-1 text-[13px] transition-all"
          style={{ fontWeight: active ? 700 : 600, color: active ? "#1E293B" : hovered ? "#1E293B" : "#64748B" }}
        >
          {label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span
          className="relative shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={badgeStyle}
        >
          {item.badge}
        </span>
      )}
      {!collapsed && active && !item.badge && (
        <span
          className="relative shrink-0 w-2 h-2 rounded-full"
          style={{
            background: "#6C5CE7",
            boxShadow: "0 0 8px rgba(108, 92, 231, 0.6)",
          }}
          aria-hidden
        />
      )}
    </Link>
  );
}
