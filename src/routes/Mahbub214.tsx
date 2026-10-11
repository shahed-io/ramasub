import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthPageEntry } from "@/components/AuthPage";
import {
  ShieldAlert, LogOut, Globe,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ExternalLink, Menu, Search, X,
  Home, Frown, ShoppingCart, Sun, Bell,
} from "lucide-react";


import { AdminGlobalSearch, useAdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { SearchTrigger } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_MENU, type AdminMenuItem } from "@/lib/admin-menu";
import { AdminMfaGate } from "@/components/admin/AdminMfaGate";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminLangProvider, useAdminLang } from "@/context/AdminLangContext";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import ramaSubLogoAsset from "@/assets/rama-logo-new.png.asset.json";
const ramaSubLogo = ramaSubLogoAsset.url;

export const Route = createFileRoute("/Mahbub214")({
  component: AdminLayout,
  // Admin panel is noindex + client-only; skip SSR so we can read cached admin
  // flag from localStorage on first render and open instantly on click.
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Rama Sub" }, { name: "description", content: "Manage Rama Sub orders, products and store settings." }, { property: "og:title", content: "Admin — Rama Sub" }, { property: "og:description", content: "Manage Rama Sub orders, products and store settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" }] }),
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
      >
        {/* Brand */}
        <div
          className={[
            collapsed
              ? "flex flex-col items-center justify-center gap-1.5 py-5 px-2"
              : "h-[74px] flex items-center justify-between px-4",
          ].join(" ")}
          data-admin-brand="true"
        >
          <Link to="/Mahbub214" className={`flex items-center gap-3 min-w-0 group ${collapsed ? "justify-center" : ""}`} aria-label="Rama Sub Admin">
            <div className="admin-brand-mark w-10 h-10 rounded-lg grid place-items-center shrink-0">
              <img src={ramaSubLogo} alt="" className="w-8 h-8 object-contain" />
            </div>
            {!collapsed && (
              <span className="leading-tight min-w-0">
                <span
                  className="block text-[16px] font-black tracking-tight"
                  
                >
                  Rama Sub
                </span>
                <span
                  className="admin-brand-caption block text-[9.5px] font-semibold uppercase mt-0.5"
                >
                  Admin Console
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
                <span className="truncate">{t("Search orders, products, users…", "সার্চ করুন…")}</span>
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
  const hasActive = group.items.some((i: AdminMenuItem) => isMenuActive(pathname, i));
  const [open, setOpen] = useState<boolean>(true);
  const { t } = useAdminLang();

  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  if (collapsed) {
    return (
      <div className="admin-nav-section py-2 last:border-0">
        {group.items.map((item: AdminMenuItem) => (
          <SidebarItem key={item.to} item={item} collapsed active={isMenuActive(pathname, item)} section={group.id} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 first:mt-2">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="admin-nav-group w-full justify-between px-3 h-8 text-[10px] font-semibold uppercase"
      >
        <span>{t(group.title, group.titleBn)}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          
        />
      </Button>
      {open && (
        <div className="space-y-0.5 mt-1">
          {group.items.map((item: AdminMenuItem) => (
            <SidebarItem key={item.to} item={item} active={isMenuActive(pathname, item)} section={group.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function isMenuActive(pathname: string, item: AdminMenuItem): boolean {
  const path = pathname.replace(/\/$/, "");
  return path === item.to || (!item.exact && path.startsWith(`${item.to}/`));
}

function SidebarItem({ item, collapsed, active, section }: { item: AdminMenuItem; collapsed?: boolean; active: boolean; section: string }) {
  const { t } = useAdminLang();
  const label = t(item.label, item.labelBn);
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      aria-current={active ? "page" : undefined}
      data-active={active}
      data-section={section}
      title={label}
      className={`admin-nav-item group relative flex items-center gap-3 min-h-11 rounded-lg text-sm transition-colors ${collapsed ? "justify-center px-2 my-1" : "px-3 py-2 my-0.5"}`}
    >
      <span className="admin-nav-icon shrink-0 w-8 h-8 rounded-lg grid place-items-center" aria-hidden="true">{item.icon}</span>
      {!collapsed && <span className="admin-nav-label flex-1 min-w-0 text-[13px] leading-5">{label}</span>}
      {!collapsed && item.badge && <span className="admin-nav-badge shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded" data-badge={item.badge}>{item.badge}</span>}
      {!collapsed && active && <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
    </Link>
  );
}
