import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AuthPageEntry } from "@/components/AuthPage";
import {
  ShieldAlert, LogOut, Globe,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ExternalLink, Menu, Search, X,
  Home, Frown, ShoppingCart,
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
      <div className="min-h-screen grid place-items-center px-4 py-10" style={{ background: "#F6F7FB" }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #E4E7EF",
            boxShadow: "0 8px 32px rgba(109,74,255,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mx-auto w-14 h-14 rounded-full grid place-items-center mb-4" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "#15192C" }}>Access denied</h1>
          <p className="text-sm mt-2" style={{ color: "#667085" }}>
            আপনার এই পেজ দেখার অনুমতি নেই।
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Link to="/" className="h-10 px-5 inline-flex items-center rounded-full text-sm font-semibold transition-all hover:opacity-80" style={{ border: "1px solid #E4E7EF", color: "#15192C", background: "#fff" }}>Home</Link>
            <button
              onClick={async () => {
                try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch {}
                await signOut();
                navigate({ to: "/login" });
              }}
              className="h-10 px-5 inline-flex items-center gap-1.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)" }}
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
    <div className="min-h-screen grid place-items-center" style={{ background: "#F6F7FB" }} role="status" aria-label="Loading admin panel">
      <div className="flex flex-col items-center gap-5">
        {/* Logo with animated gradient ring */}
        <div className="relative w-20 h-20">
          <div className="admin-loader-ring" />
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center"
              style={{
                background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)",
                boxShadow: "0 8px 24px rgba(109,74,255,0.4)",
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
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold tracking-wide" style={{ color: "#15192C" }}>Rama Sub</span>
          <span className="text-xs font-medium tracking-wide" style={{ color: "#667085" }}>Loading admin panel…</span>
        </div>

        {/* Animated progress bars */}
        <div className="flex items-center gap-1.5">
          <span className="admin-loader-bar" style={{ animationDelay: "0ms" }} />
          <span className="admin-loader-bar" style={{ animationDelay: "150ms" }} />
          <span className="admin-loader-bar" style={{ animationDelay: "300ms" }} />
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
      style={{ background: "#F6F7FB", color: "#15192C" }}
    >
      {/* Ambient glossy blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #6D4AFF 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
        />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm"
          style={{ background: "rgba(21,25,44,0.35)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={[
          "shrink-0 transition-all duration-300 ease-in-out flex flex-col h-[100dvh] max-h-[100dvh] lg:relative",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:z-10",
          collapsed ? "lg:w-[78px]" : "lg:w-[270px]",
          "fixed top-0 left-0 z-50 w-[min(22rem,92vw)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{
          background: "rgba(255,255,255,0.97)",
          borderRight: "1px solid #E4E7EF",
          boxShadow: "4px 0 32px rgba(109,74,255,0.06)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Top gloss stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, #6D4AFF, #4f46e5, #6D4AFF)" }}
        />

        {/* Brand */}
        <div
          className={[
            collapsed
              ? "flex flex-col items-center justify-center gap-1.5 py-5 px-2"
              : "h-[72px] flex items-center justify-between px-4",
          ].join(" ")}
          style={{ borderBottom: "1px solid #E4E7EF" }}
        >
          <Link to="/Mahbub214" className={`flex items-center gap-3 min-w-0 group ${collapsed ? "justify-center" : ""}`} aria-label="Rama Sub Admin">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0 group-hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)",
                boxShadow: "0 6px 18px -2px rgba(109,74,255,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <span className="leading-tight min-w-0">
                <span
                  className="block text-[15px] font-extrabold tracking-tight bg-clip-text text-transparent"
                  style={{
                    fontFamily: "'Poppins', var(--font-heading)",
                    backgroundImage: "linear-gradient(90deg, #6D4AFF 0%, #4f46e5 60%, #818cf8 100%)",
                  }}
                >
                  Rama Sub
                </span>
                <span
                  className="block text-[9px] font-black uppercase tracking-[0.22em] mt-0.5"
                  style={{ color: "#667085" }}
                >
                  Admin Console
                </span>
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg transition hover:opacity-80"
            style={{ color: "#667085" }}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={[
              "hidden lg:inline-flex items-center justify-center rounded-lg transition",
              collapsed ? "w-9 h-9" : "w-8 h-8",
            ].join(" ")}
            style={{
              color: "#667085",
              background: collapsed ? "#EEE9FF" : "transparent",
              border: collapsed ? "1px solid #E4E7EF" : "none",
            }}
            aria-label={collapsed ? t("Expand sidebar", "সাইডবার বড় করুন") : t("Collapse sidebar", "সাইডবার ছোট করুন")}
            title={collapsed ? t("Expand sidebar", "সাইডবার বড় করুন") : t("Collapse sidebar", "সাইডবার ছোট করুন")}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <SearchTrigger
              size="sm"
              onClick={() => setGlobalOpen(true)}
              placeholder={t("Search anything…", "যেকোনো কিছু খুঁজুন…")}
            />
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 admin-scroll">
          {filteredMenu.map((group) => (
            <SidebarGroup key={group.id} group={group} collapsed={collapsed} pathname={pathname} />
          ))}
        </nav>

        {/* User footer */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid #E4E7EF", background: "rgba(238,233,255,0.3)" }}
        >
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <div
              className="w-9 h-9 rounded-xl grid place-items-center text-xs font-black shrink-0 text-white"
              style={{
                background: "linear-gradient(135deg, #6D4AFF 0%, #4f46e5 100%)",
                boxShadow: "0 4px 12px -2px rgba(109,74,255,0.45)",
              }}
            >
              {(user?.email ?? "A").slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate" style={{ color: "#15192C" }}>{t("Admin", "অ্যাডমিন")}</div>
                <div className="text-[11px] truncate" style={{ color: "#667085" }}>{user?.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
                className="shrink-0 w-8 h-8 rounded-lg grid place-items-center transition hover:opacity-80"
                style={{ color: "#667085", background: "transparent" }}
                title={t("Logout", "লগআউট")}
                aria-label={t("Logout", "লগআউট")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#DC2626";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#667085";
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="flex-1 min-w-0 w-full flex flex-col lg:h-[100dvh] lg:overflow-y-auto relative z-[1]">

        {/* Top bar */}
        <header
          className="h-[66px] sticky top-0 z-20"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #E4E7EF",
            boxShadow: "0 2px 16px rgba(109,74,255,0.04)",
          }}
        >
          {/* Header gloss accent */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(109,74,255,0.2), transparent)" }}
          />

          <div className="h-full px-3 md:px-5 flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl grid place-items-center transition hover:opacity-80"
              style={{
                color: "#15192C",
                background: "#EEE9FF",
                border: "1px solid #E4E7EF",
              }}
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="hidden md:flex flex-col justify-center min-w-0 h-full py-1">
              <div
                className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase"
                style={{ color: "#667085" }}
              >
                <span>
                  {currentPage
                    ? t(currentPage.group.title, currentPage.group.titleBn)
                    : t(ADMIN_MENU[0].title, ADMIN_MENU[0].titleBn)}
                </span>
                <ChevronRight className="w-3 h-3" style={{ color: "#E4E7EF" }} />
                <span style={{ color: "#6D4AFF" }}>
                  {currentPage
                    ? t(currentPage.item.label, currentPage.item.labelBn)
                    : t("Dashboard", "ড্যাশবোর্ড")}
                </span>
              </div>
              <div
                className="font-black text-[17px] leading-tight mt-0.5 truncate"
                style={{ fontFamily: "var(--font-heading)", color: "#15192C" }}
              >
                {currentPage
                  ? t(currentPage.item.label, currentPage.item.labelBn)
                  : t("Dashboard", "ড্যাশবোর্ড")}
              </div>
            </div>

            <div className="md:hidden flex-1 min-w-0 font-bold text-sm truncate" style={{ color: "#15192C" }}>
              {currentPage
                ? t(currentPage.item.label, currentPage.item.labelBn)
                : t("Dashboard", "ড্যাশবোর্ড")}
            </div>

            <div className="hidden md:block flex-1" />

            <button
              type="button"
              onClick={toggle}
              aria-label={t("Switch to Bangla", "ইংরেজিতে পরিবর্তন")}
              title={lang === "en" ? "বাংলায় দেখুন" : "Show in English"}
              className="inline-flex h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold items-center gap-1.5 transition shrink-0"
              style={{
                color: "#15192C",
                background: "#fff",
                border: "1px solid #E4E7EF",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <Globe className="w-3.5 h-3.5" style={{ color: "#6D4AFF" }} /> {lang === "en" ? "বাং" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setGlobalOpen(true)}
              className="xl:hidden h-9 w-9 rounded-xl grid place-items-center transition shrink-0"
              style={{
                color: "#15192C",
                background: "#fff",
                border: "1px solid #E4E7EF",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
              aria-label={t("Search", "খুঁজুন")}
              title={t("Search", "খুঁজুন")}
            >
              <Search className="w-4 h-4" style={{ color: "#667085" }} />
            </button>
            <SearchTrigger
              size="sm"
              onClick={() => setGlobalOpen(true)}
              placeholder={t("Search…", "খুঁজুন…")}
              className="hidden xl:block w-64"
            />

            <Link
              to="/"
              className="hidden sm:inline-flex h-9 px-3 rounded-xl text-xs font-bold items-center gap-1.5 transition hover:opacity-80"
              style={{
                color: "#6D4AFF",
                background: "#EEE9FF",
                border: "1px solid rgba(109,74,255,0.2)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> {t("View store", "স্টোর দেখুন")}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-3 sm:p-5 md:p-7 min-w-0 w-full overflow-x-hidden" style={{ color: "#15192C" }}>
          <div className="mx-auto w-full max-w-[1400px] min-w-0">
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
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [hovered, setHovered] = useState(false);

  const badgeStyle =
    item.badge === "LIVE"
      ? { background: "#DC2626", color: "#fff" }
      : item.badge === "NEW"
        ? { background: "#6D4AFF", color: "#fff" }
        : { background: "#B45309", color: "#fff" };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  };

  const activeBg = "linear-gradient(135deg, #FF705B 0%, #FF9068 100%)";
  const activeColor = "#ffffff";
  const hoverBg = "rgba(255,112,91,0.08)";

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      title={collapsed ? label : undefined}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "group relative flex items-center gap-3 rounded-[14px] text-sm overflow-hidden",
        "transition-all duration-200 ease-out will-change-transform",
        "active:scale-[0.97]",
        collapsed ? "justify-center px-2 py-2.5 mx-1 my-0.5" : "px-2.5 py-2.5",
      ].join(" ")}
      style={active ? {
        background: activeBg,
        boxShadow: "0 4px 14px -4px rgba(255,112,91,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
        color: activeColor,
        fontWeight: 700,
        border: "1px solid rgba(255,112,91,0.8)",
      } : hovered ? {
        background: hoverBg,
        color: "#15192C",
        border: "1px solid transparent",
      } : {
        color: "#667085",
        border: "1px solid transparent",
      }}
    >
      {/* Left active indicator bar - hidden in new design */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300 ease-out hidden"
      />
      {/* Ripple effects */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full animate-[adminRipple_0.6s_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: 8, height: 8, transform: "translate(-50%, -50%)", background: "rgba(109,74,255,0.18)" }}
        />
      ))}
      {/* Icon */}
      <span
        style={{
          ...iconGradientStyle(item.grad),
          boxShadow: active
            ? "none"
            : "0 2px 8px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
          border: active ? "1px solid rgba(255,255,255,0.3)" : "none",
        }}
        className={[
          "shrink-0 w-8 h-8 rounded-full grid place-items-center text-white",
          "transition-transform duration-200",
          active ? "scale-110" : "group-hover:scale-105 group-active:scale-95",
        ].join(" ")}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span
          className="relative truncate flex-1 text-[13px] transition-all"
          style={{ fontWeight: active ? 700 : 600, color: active ? "#ffffff" : hovered ? "#15192C" : "#667085" }}
        >
          {label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span
          className="relative shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
          style={badgeStyle}
        >
          {item.badge}
        </span>
      )}
      {!collapsed && active && !item.badge && (
        <span
          className="relative shrink-0 w-1.5 h-1.5 rounded-full"
          style={{ background: "#ffffff", animation: "adminActivePulse 2s ease-in-out infinite" }}
          aria-hidden
        />
      )}
    </Link>
  );
}
