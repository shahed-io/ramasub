import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AuthPageEntry } from "@/components/AuthPage";
import {
  ShieldAlert, LogOut, Globe,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ExternalLink, Menu, X,
} from "lucide-react";
import { AdminGlobalSearch, useAdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { SearchTrigger } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_MENU, type AdminMenuItem } from "@/lib/admin-menu";
import { AdminMfaGate } from "@/components/admin/AdminMfaGate";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminLangProvider, useAdminLang } from "@/context/AdminLangContext";
import accessNowLogo from "@/assets/logo-gold-a.webp";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — AccessNow BD" }, { name: "robots", content: "noindex,nofollow" }] }),
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

// Legacy splash/loader cache keys written by earlier versions. We scrub these
// on every admin mount so any stale "splash seen" / "boot" flag is wiped from
// localStorage and the splash can never reappear.
// NOTE: ADMIN_CACHE_KEY is intentionally NOT included — we keep it so the
// shell can render optimistically while re-verifying in the background.
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
  // Read cache synchronously in initializer so first render already has it.
  const initialCachedAdmin = typeof window !== "undefined" ? readCachedAdmin() : false;
  const [cachedAdmin] = useState(initialCachedAdmin);
  const [isAdmin, setIsAdmin] = useState(initialCachedAdmin);
  const [verified, setVerified] = useState(initialCachedAdmin);
  const [roleError, setRoleError] = useState<{
    message: string;
    code?: string;
    details?: string;
    hint?: string;
    raw?: unknown;
  } | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  // Wipe historical splash/admin flags immediately on mount so a stale client
  // flag can never leave the route on an empty gradient screen.
  useEffect(() => {
    purgeLegacySplashFlags();
  }, []);

  // Admin panel is always light/white themed regardless of the user-selected
  // site theme. Force `theme-white` on <html> while mounted, then restore on unmount.
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

  // Optimistic render: if we have a cached admin flag, skip all blocking
  // spinners and render the shell immediately. Background verification still
  // runs and will redirect/deny if the cached flag is stale.
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
    const hasError = !!roleError;
    return (
      <div className="min-h-screen grid place-items-center bg-[#f6f7fb] px-4 py-10">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-slate-900">
                {hasError ? "Permission check failed" : "Access denied"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {hasError
                  ? `We couldn't verify admin permissions for ${user?.email}.`
                  : `Your account (${user?.email}) does not have admin permissions.`}
              </p>

              {hasError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                    has_role error
                  </div>
                  <p className="mt-1 text-sm font-medium text-rose-900 break-words">
                    {roleError!.message}
                  </p>
                  <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                    {roleError!.code && (
                      <>
                        <dt className="text-slate-500">Code</dt>
                        <dd className="font-mono text-slate-800 break-all">{roleError!.code}</dd>
                      </>
                    )}
                    {roleError!.details && (
                      <>
                        <dt className="text-slate-500">Details</dt>
                        <dd className="text-slate-800 break-words">{roleError!.details}</dd>
                      </>
                    )}
                    {roleError!.hint && (
                      <>
                        <dt className="text-slate-500">Hint</dt>
                        <dd className="text-slate-800 break-words">{roleError!.hint}</dd>
                      </>
                    )}
                    <dt className="text-slate-500">User ID</dt>
                    <dd className="font-mono text-slate-800 break-all">{user?.id}</dd>
                    <dt className="text-slate-500">Checked</dt>
                    <dd className="text-slate-800">{checkedAt ?? "—"}</dd>
                  </dl>
                  {roleError!.raw !== undefined && (
                    <details className="mt-3">
                      <summary className="text-[12px] font-semibold text-rose-700 cursor-pointer">
                        Raw response
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 text-slate-100 text-[11px] p-3 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(roleError!.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="mt-3 text-[12px] text-slate-600">
                    Common causes: not signed in (missing JWT), RPC <code className="font-mono">has_role</code> not deployed, RLS blocking the call, or network/CORS error.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {hasError && user && (
                  <button
                    onClick={() => verifyRole(user.id)}
                    className="h-10 px-4 inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                  >
                    Retry check
                  </button>
                )}
                <Link to="/" className="h-10 px-4 inline-flex items-center rounded-full border border-slate-200 text-sm font-semibold text-slate-700">Home</Link>
                <button
                  onClick={async () => {
                    try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch {}
                    await signOut();
                    navigate({ to: "/login" });
                  }}
                  className="h-10 px-4 inline-flex items-center gap-1 rounded-full bg-slate-900 text-white text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MFA gate: requires Authenticator code OR email OTP fallback before admin shell renders.
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
    <div className="min-h-screen grid place-items-center bg-[#fafafa]" role="status" aria-label="Loading admin panel">
      <div className="flex flex-col items-center gap-5">
        {/* Logo with animated gradient ring */}
        <div className="relative w-16 h-16">
          <div className="admin-loader-ring" />
          <div className="absolute inset-0 grid place-items-center">
            <img
              src={accessNowLogo}
              alt=""
              className="w-10 h-10 object-contain admin-loader-logo"
              draggable={false}
            />
          </div>
        </div>

        {/* Animated text */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 tracking-wide">AccessNow BD</span>
          <span className="text-xs text-slate-400 font-medium tracking-wide">Loading admin panel</span>
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
    <div className="admin-shell admin-clarity lg:h-screen lg:overflow-hidden min-h-screen flex relative font-['Manrope',ui-sans-serif,system-ui] text-slate-900 bg-[var(--admin-bg)]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={[
          "shrink-0 transition-all duration-200 flex flex-col h-screen lg:relative",
          "bg-[var(--admin-panel)] border-r border-[var(--admin-border)]",
          "lg:sticky lg:top-0 lg:translate-x-0 lg:z-10",
          collapsed ? "lg:w-[76px]" : "lg:w-[260px]",
          "fixed top-0 left-0 z-50 w-[260px] max-w-[85vw] shadow-2xl lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className={[
          "border-b border-slate-100",
          collapsed
            ? "flex flex-col items-center justify-center gap-1.5 py-3 px-2"
            : "h-[68px] flex items-center justify-between px-4",
        ].join(" ")}>

          <Link to="/admin" className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center" : ""}`}>
            <span className="relative shrink-0 grid place-items-center w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-200 bg-white">
              <img
                src={accessNowLogo}
                alt="AccessNow BD"
                draggable={false}
                className="relative w-[140%] h-[140%] object-contain translate-y-[2%]"
              />
            </span>
            {!collapsed && (
              <span className="leading-tight min-w-0">
                <span className="block text-[15px] font-extrabold tracking-tight text-[var(--admin-ink)]">AccessNow BD</span>
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--admin-muted)] mt-0.5">Admin Console</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={[
              "hidden lg:inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition",
              collapsed ? "w-9 h-9 ring-1 ring-slate-200 bg-white" : "w-8 h-8",
            ].join(" ")}
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

        {/* User */}
        <div className="border-t border-[var(--admin-border)] p-3 bg-[var(--admin-panel)]">
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 grid place-items-center text-xs font-bold shrink-0 ring-1 ring-slate-200">
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
                className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                title={t("Logout", "লগআউট")}
                aria-label={t("Logout", "লগআউট")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-y-auto relative z-[1]">

        {/* Top bar */}
        <header className="h-[64px] sticky top-0 z-20 bg-[var(--admin-panel)] border-b border-[var(--admin-border)] shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
          <div className="h-full px-3 md:px-6 flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg grid place-items-center border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-sm min-w-0">
              <span className="text-[12px] font-semibold text-slate-500">
                {currentPage
                  ? t(currentPage.group.title, currentPage.group.titleBn)
                  : t(ADMIN_MENU[0].title, ADMIN_MENU[0].titleBn)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-bold text-slate-900 truncate">
                {currentPage
                  ? t(currentPage.item.label, currentPage.item.labelBn)
                  : t("Dashboard", "ড্যাশবোর্ড")}
              </span>
            </div>

            <div className="md:hidden flex-1 min-w-0 font-bold text-sm truncate text-slate-900">
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
              className="inline-flex h-9 px-2.5 sm:px-3 rounded-lg text-xs font-bold items-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shrink-0"
            >
              <Globe className="w-3.5 h-3.5" /> {lang === "en" ? "বাং" : "EN"}
            </button>
            <SearchTrigger
              size="sm"
              onClick={() => setGlobalOpen(true)}
              placeholder={t("Search…", "খুঁজুন…")}
              className="hidden xl:block w-64"
            />

            <Link to="/" className="hidden sm:inline-flex h-9 px-3 rounded-lg text-xs font-bold items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition">
              <ExternalLink className="w-3.5 h-3.5" /> {t("View store", "স্টোর দেখুন")}
            </Link>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden text-[var(--admin-ink)]">
          <div className="mx-auto max-w-[1400px]">
            <AdminPageHeader />
            <Outlet />
          </div>
        </div>

      </div>

      <AdminGlobalSearch open={globalOpen} onOpenChange={setGlobalOpen} />

      <style>{`
        .admin-scroll::-webkit-scrollbar { width: 6px; }
        .admin-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,.18); border-radius: 999px; }
        .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,.32); }
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
      <div className="py-2 border-b border-slate-100 last:border-0">
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
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--admin-muted)] hover:text-[var(--admin-ink)] transition"
      >
        <span>{t(group.title, group.titleBn)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
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
  "blue-500": "#2563eb",
  "blue-600": "#1d4ed8",
  "cyan-500": "#0891b2",
  "emerald-500": "#059669",
  "emerald-600": "#047857",
  "fuchsia-500": "#c026d3",
  "fuchsia-600": "#a21caf",
  "green-500": "#16a34a",
  "green-600": "#15803d",
  "indigo-500": "#4f46e5",
  "indigo-600": "#4338ca",
  "indigo-700": "#3730a3",
  "orange-400": "#f97316",
  "orange-500": "#ea580c",
  "orange-600": "#c2410c",
  "pink-500": "#db2777",
  "pink-600": "#be185d",
  "purple-600": "#9333ea",
  "red-500": "#dc2626",
  "red-600": "#b91c1c",
  "red-700": "#991b1b",
  "rose-500": "#e11d48",
  "rose-600": "#be123c",
  "sky-500": "#0284c7",
  "slate-600": "#475569",
  "slate-800": "#1e293b",
  "teal-500": "#0d9488",
  "teal-600": "#0f766e",
  "violet-500": "#7c3aed",
  "yellow-500": "#ca8a04",
};

function iconGradientStyle(grad: string): CSSProperties {
  const from = /from-([\w-]+)/.exec(grad)?.[1] ?? "violet-500";
  const to = /to-([\w-]+)/.exec(grad)?.[1] ?? "fuchsia-500";
  return {
    backgroundImage: `linear-gradient(135deg, ${ADMIN_ICON_COLORS[from] ?? "#7c3aed"} 0%, ${ADMIN_ICON_COLORS[to] ?? "#c026d3"} 100%)`,
  };
}

function SidebarItem({ item, collapsed, active }: { item: AdminMenuItem; collapsed?: boolean; active: boolean }) {
  const { t } = useAdminLang();
  const label = t(item.label, item.labelBn);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const badgeClass = item.badge === "LIVE"
    ? "bg-rose-600 text-white ring-1 ring-rose-700/40 shadow-sm"
    : item.badge === "NEW"
      ? "bg-violet-600 text-white ring-1 ring-violet-700/40 shadow-sm"
      : "bg-amber-500 text-white ring-1 ring-amber-600/40 shadow-sm";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  };

  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      title={collapsed ? label : undefined}
      onClick={handleClick}
      className={[
        "admin-nav-item group relative flex items-center gap-3 rounded-xl text-sm overflow-hidden",
        "transition-all duration-200 ease-out will-change-transform",
        "active:scale-[0.97] hover:translate-x-0.5",
        collapsed ? "justify-center px-2 py-2 mx-1 my-0.5" : "px-2.5 py-2",
        active
          ? "bg-gradient-to-r from-violet-100 to-violet-50 text-violet-900 ring-1 ring-violet-300 shadow-[0_1px_0_0_rgba(124,58,237,0.08)_inset]"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      ].join(" ")}
    >
      {/* animated left indicator */}
      <span
        aria-hidden
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500",
          "transition-all duration-300 ease-out",
          active ? "h-6 opacity-100" : "h-0 opacity-0",
        ].join(" ")}
      />
      {/* ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-violet-400/30 animate-[adminRipple_0.6s_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: 8, height: 8, transform: "translate(-50%, -50%)" }}
        />
      ))}
      <span
        style={iconGradientStyle(item.grad)}
        className={[
          "admin-menu-icon relative shrink-0 w-9 h-9 rounded-xl grid place-items-center text-white bg-[var(--admin-primary)] ring-1 ring-slate-900/10 shadow-[0_10px_22px_-10px_rgba(15,23,42,0.65)]",
          "transition-transform duration-200",
          active ? "scale-110" : "group-hover:scale-105 group-active:scale-95",
        ].join(" ")}
      >
        {item.icon}
      </span>
      {!collapsed && (
        <span className={`relative truncate flex-1 text-[13px] transition-all ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
      )}
      {!collapsed && item.badge && (
        <span className={`relative shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
          {item.badge}
        </span>
      )}
      {!collapsed && active && !item.badge && (
        <span className="relative shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" aria-hidden />
      )}
    </Link>
  );
}





