import { Link } from "@tanstack/react-router";
import accessNowLogo from "@/assets/logo-gold-a.webp";
import {
  Crown,
  Search,
  Menu,
  X,
  Zap,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  ChevronRight,
  LogIn,
  UserCircle2,
  LogOut,
  Home,
  ShoppingBag,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  Flame,
  Headphones,
  Tv,
  Bot,
  Package,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CartIcon } from "@/components/CartIcon";
import { AccountIcon } from "@/components/AccountIcon";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { GlobalSearch, useGlobalSearch } from "@/components/GlobalSearch";
import { SearchTrigger } from "@/components/SearchBar";

const NAV: Array<{
  label: string;
  to: "/" | "/categories" | "/education" | "/faq" | "/contact";
}> = [
  { label: "Home", to: "/" },
  { label: "All Products", to: "/categories" },
  { label: "Education", to: "/education" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
];

export function TopUtilityBar() {
  return (
    <div className="relative z-40 overflow-hidden bg-background">
      <div
        className="relative mx-auto max-w-[1440px] px-3 sm:px-5 md:px-10 flex items-center justify-between gap-3 text-white"
        style={{
          minHeight: "clamp(32px, 2.6vw, 40px)",
          fontSize: "clamp(10.5px, 0.78vw, 12.5px)",
        }}
      >
        {/* LEFT — trust chips */}
        <div className="flex items-center" style={{ gap: "clamp(6px, 0.7vw, 14px)" }}>
          <span
            className="inline-flex items-center gap-1.5 font-bold tracking-tight rounded-full border border-white/10"
            style={{
              padding: "2px clamp(6px, 0.7vw, 12px)",
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(0,229,255,0.18))",
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 14px -6px rgba(0,229,255,0.4)",
            }}
          >
            <Zap className="w-3 h-3 text-aqua" strokeWidth={2.5} />
            <span className="font-extrabold text-white">
              Fast · Secure · Reliable
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-white/75 font-medium">
            <span className="grid place-items-center w-4 h-4 rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" strokeWidth={2.5} />
            </span>
            <span className="hidden md:inline">100% Verified</span>
            <span className="md:hidden">Verified</span>
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-white/75 font-medium">
            <Sparkles className="w-3 h-3 text-violet-300" strokeWidth={2.5} />
            Instant Delivery
          </span>
        </div>

        {/* RIGHT — socials, phone, status */}
        <div className="flex items-center" style={{ gap: "clamp(6px, 0.8vw, 16px)" }}>
          {/* Social icon placeholders removed — no real accounts wired yet */}

          <a
            href="tel:+8801580607614"
            className="hidden md:inline-flex items-center gap-1.5 text-white/85 hover:text-white transition font-semibold"
          >
            <span className="grid place-items-center w-5 h-5 rounded-full bg-aqua/15 ring-1 ring-aqua/35">
              <PhoneCall className="w-2.5 h-2.5 text-aqua" strokeWidth={2.5} />
            </span>
            <span className="tabular-nums tracking-tight">+880 1580-607614</span>
          </a>
          <span className="hidden md:block w-px h-3.5 bg-white/15" />
          <span
            className="inline-flex items-center gap-1.5 font-bold rounded-full border border-emerald-400/30"
            style={{
              padding: "2px clamp(6px, 0.6vw, 10px)",
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))",
            }}
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-emerald-200">Online</span>
            <span className="text-white/70 font-medium hidden sm:inline">· 11 AM – 11 PM</span>
          </span>
        </div>
      </div>

    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setDisplayName(null); return; }
    let cancelled = false;
    (async () => {
      const p = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setDisplayName((p.data as { display_name?: string | null } | null)?.display_name || null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const friendlyName = displayName || user?.email?.split("@")[0] || "Member";

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <TopUtilityBar />
      <header className="sticky top-0 z-40">
        <div
          className={[
            "relative transition-[background-color,box-shadow,backdrop-filter] duration-300 will-change-[background-color]",
            scrolled
              ? "bg-background/65 backdrop-blur-2xl shadow-[0_18px_50px_-24px_rgba(0,0,0,0.7)]"
              : "bg-background/35 backdrop-blur-xl",
          ].join(" ")}
        >
          <div className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-10 h-[64px] md:h-[68px] grid grid-cols-[auto_1fr_auto] items-center gap-2 md:flex md:justify-between md:gap-5 md:flex-nowrap">
            {/* Mobile-only: theme switcher on the left */}
            <div className="md:hidden justify-self-start">
              <ThemeSwitcher />
            </div>

            {/* Brand */}
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 shrink-0 group min-w-0 justify-self-center md:justify-self-auto"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {/* Brand logo — clean round premium badge */}
              <span className="relative shrink-0">
                {/* Outer rotating gradient ring */}
                <span
                  aria-hidden
                  className="absolute -inset-[2px] rounded-full opacity-90"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #2f6dff, #1fc796, #f59e0b, #2f6dff)",
                    animation: "aurora-pan 6s linear infinite",
                    filter: "blur(0.5px)",
                  }}
                />
                {/* Soft outer glow */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-2 rounded-full opacity-60 blur-lg -z-10"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(56,128,255,0.55) 0%, rgba(31,199,150,0.3) 50%, transparent 75%)",
                  }}
                />
                {/* Inner round badge — frosted light bg so dark logo strokes stay readable */}
                <span
                  className="relative grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden ring-1 ring-white/30 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.6)] group-hover:scale-105 transition-transform duration-500"
                  style={{ background: "#ffffff" }}
                >
                  {/* Top gloss highlight */}
                  <span className="pointer-events-none absolute inset-x-1 top-0.5 h-3 rounded-full bg-white/60 blur-[3px]" />
                  {/* Bottom inner shadow */}
                  <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-6px_12px_-6px_rgba(0,0,0,0.08)]" />
                  <img
                    src={accessNowLogo}
                    alt="AccessNow BD"
                    draggable={false}
                    className="relative w-[145%] h-[145%] object-contain -translate-y-[6%] drop-shadow-[0_2px_4px_rgba(30,79,216,0.25)]"
                  />
                  {/* Sweeping shine effect on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)",
                    }}
                  />
                </span>
              </span>

              {/* Wordmark — matches footer brand (Access · Now · BD + tagline) */}
              <span className="leading-[1.05] min-w-0">
                <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span
                    className="text-[18px] sm:text-[20px] md:text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, #1e3fb8 0%, #1d4ed8 55%, #0f2773 100%)",
                    }}
                  >
                    Access
                  </span>
                  <span
                    className="text-[18px] sm:text-[20px] md:text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, #6ce4b8 0%, #1fc796 55%, #0e9472 100%)",
                    }}
                  >
                    Now
                  </span>
                  <span
                    className="text-[18px] sm:text-[20px] md:text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, #ffd86b 0%, #f59e0b 55%, #c2780a 100%)",
                    }}
                  >
                    BD
                  </span>
                </span>
                <span className="mt-1 flex w-full max-w-[180px] md:max-w-[200px] items-center justify-between gap-2">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-bold text-white/70">
                    Fast
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#2f6dff] shadow-[0_0_6px_rgba(47,109,255,0.8)]" />
                  <span className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-bold text-white/70">
                    Secure
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#1fc796] shadow-[0_0_6px_rgba(31,199,150,0.8)]" />
                  <span className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-bold text-white/70">
                    Reliable
                  </span>
                </span>
              </span>
            </Link>

            {/* Nav — pill glass with magnetic sliding indicator */}
            <MagneticNav />

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <SearchTrigger
                onClick={() => setSearchOpen(true)}
                className="site-search-trigger hidden xl:block w-[180px] 2xl:w-[240px] min-w-0"
                placeholder="প্রোডাক্ট সার্চ করুন..."
              />


              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="xl:hidden grid place-items-center w-10 h-10 rounded-full glass-soft border border-white/10 text-white shrink-0"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-aqua" />
              </button>

              <div className="hidden md:flex items-center gap-1.5 md:gap-2">
                <ThemeSwitcher />

                <CartIcon />

                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-1.5 sm:gap-2 h-10 sm:h-11 rounded-full bg-gradient-to-r from-primary via-violet-500 to-aqua text-primary-foreground font-bold shadow-[0_12px_30px_-10px_rgba(124,58,237,0.7)] hover:scale-[1.03] transition whitespace-nowrap"
                      style={{
                        paddingLeft: "clamp(10px, 1vw, 18px)",
                        paddingRight: "clamp(10px, 1vw, 18px)",
                        fontSize: "clamp(11.5px, 0.9vw, 14px)",
                      }}
                      title={friendlyName}
                    >
                      <UserCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline max-w-[120px] truncate">Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      aria-label="Logout"
                      title="Logout"
                      className="grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-full glass-soft border border-white/10 text-white hover:bg-white/10 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => rememberReturnTo()}
                    className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 sm:px-4 rounded-full text-white text-[12px] sm:text-[13px] font-semibold tracking-tight bg-gradient-to-r from-primary via-violet-500 to-aqua shadow-[0_8px_22px_-10px_rgba(124,58,237,0.55)] hover:brightness-110 transition"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Login
                  </Link>
                )}
              </div>

              <button
                onClick={() => setOpen((o) => !o)}
                className="md:hidden grid place-items-center w-10 h-10 rounded-full glass-soft border border-white/10 text-white shrink-0"
                aria-label="Menu"
                aria-expanded={open}
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile horizontal nav strip removed — nav lives in the three-dot menu */}

          {/* bottom hairline removed */}
        </div>

        {/* Mobile menu — premium slide-in panel */}
        {open && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-violet-900/20 backdrop-blur-sm animate-in fade-in duration-200"
            />
            {/* Panel */}
            <aside
              className="md:hidden fixed right-0 top-0 z-50 h-[100dvh] w-[88vw] max-w-[360px] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_60%,#f3eefe_100%)] border-l border-violet-200/60 shadow-[0_30px_80px_-20px_rgba(124,58,237,0.25)] animate-in slide-in-from-right duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              {/* Top: brand + close */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-white via-white/95 to-transparent">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative grid place-items-center w-10 h-10 rounded-xl bg-white shrink-0 ring-1 ring-violet-200 shadow-[0_8px_22px_-10px_rgba(124,58,237,0.35)] overflow-hidden">
                    <img src={accessNowLogo} alt="" className="w-[145%] h-[145%] object-contain" draggable={false} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="flex items-baseline gap-1">
                      <span className="text-[15px] font-extrabold text-slate-900">Access</span>
                      <span className="text-[15px] font-extrabold text-aqua">Now</span>
                      <span className="text-[15px] font-extrabold text-gold">BD</span>
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-violet-500/80 mt-0.5">
                      Premium Menu
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid place-items-center w-9 h-9 rounded-full border border-violet-300 text-violet-600 hover:bg-violet-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-6 space-y-4">
                {/* Welcome card */}
                <div className="relative overflow-hidden rounded-2xl p-4 bg-[linear-gradient(120deg,#6d28d9_0%,#a855f7_50%,#ec4899_100%)] shadow-[0_18px_40px_-14px_rgba(168,85,247,0.55)]">
                  <span className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
                  <div className="relative flex items-center gap-3">
                    <span className="grid place-items-center w-12 h-12 rounded-full bg-white/20 ring-2 ring-white/40 text-white font-extrabold text-base shrink-0">
                      {user ? friendlyName.charAt(0).toUpperCase() : <UserCircle2 className="w-6 h-6" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                        {user ? "Welcome Back ✨" : "Welcome Guest ✨"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white font-extrabold text-[15px] truncate">
                          {user ? friendlyName : "Sign in to continue"}
                        </span>
                        {user && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
                      </div>
                      {user && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/25 border border-white/40 text-[10px] font-bold text-white">
                          <Crown className="w-3 h-3 text-gold" /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/80 shrink-0" />
                  </div>
                </div>

                {/* Quick action tiles */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { to: "/orders" as const, label: "Orders", Icon: Package, grad: "from-indigo-500 to-blue-600" },
                    { to: "/cart" as const, label: "Cart", Icon: ShoppingBag, grad: "from-emerald-400 to-teal-600" },
                    { to: (user ? "/profile" : "/login") as "/profile" | "/login", label: "Profile", Icon: UserCircle2, grad: "from-fuchsia-400 to-pink-600" },
                    { to: "/contact" as const, label: "Support", Icon: Headphones, grad: "from-amber-400 to-orange-600" },
                  ].map(({ to, label, Icon, grad }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setOpen(false)}
                      className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white border border-violet-200/70 hover:border-violet-400 hover:bg-violet-50 transition active:scale-95 shadow-[0_4px_14px_-8px_rgba(124,58,237,0.25)]"
                    >
                      <span className={`grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.45)] ring-1 ring-white/40`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">{label}</span>
                    </Link>
                  ))}
                </div>

                {/* Promo cards */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/products"
                    onClick={() => setOpen(false)}
                    className="relative overflow-hidden rounded-2xl p-3 bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] shadow-[0_12px_28px_-12px_rgba(239,68,68,0.55)] active:scale-[0.98] transition"
                  >
                    <div className="flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5" /> Hot Deals
                    </div>
                    <div className="mt-1.5 text-white text-[15px] font-extrabold leading-tight">Up to 50% OFF</div>
                    <div className="mt-1 text-white/85 text-[10px] font-semibold">প্যাকেজ দেখুন →</div>
                  </Link>
                  <a
                    href="https://wa.me/8801580607614"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="relative overflow-hidden rounded-2xl p-3 bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_12px_28px_-12px_rgba(16,185,129,0.55)] active:scale-[0.98] transition"
                  >
                    <div className="flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-wider">
                      <MessageCircle className="w-3.5 h-3.5" /> Live 24/7
                    </div>
                    <div className="mt-1.5 text-white text-[15px] font-extrabold leading-tight">সাহায্য নিন</div>
                    <div className="mt-1 text-white/85 text-[10px] font-semibold">WhatsApp চ্যাট →</div>
                  </a>
                </div>

                {/* Trending */}
                <div>
                  <div className="flex items-center gap-2 my-3">
                    <span className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-violet-300/60" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-600 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Trending <Sparkles className="w-3 h-3" />
                    </span>
                    <span className="flex-1 h-px bg-gradient-to-l from-transparent via-violet-300/60 to-violet-300/60" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/streaming"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-violet-300 text-slate-800 text-[12px] font-bold hover:bg-violet-50 transition"
                    >
                      <Tv className="w-3.5 h-3.5 text-violet-500" /> Streaming
                    </Link>
                    <Link
                      to="/ai-tools"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-aqua/40 text-slate-800 text-[12px] font-bold hover:bg-aqua/10 transition"
                    >
                      <Bot className="w-3.5 h-3.5 text-aqua" /> AI Tools
                    </Link>
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  <div className="flex items-center gap-2 my-3">
                    <span className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-violet-300/60" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-600 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Navigation <Sparkles className="w-3 h-3" />
                    </span>
                    <span className="flex-1 h-px bg-gradient-to-l from-transparent via-violet-300/60 to-violet-300/60" />
                  </div>
                  <nav className="grid gap-2">
                    {[
                      { to: "/" as const, label: "Home", Icon: Home, grad: "from-orange-400 to-amber-600", badge: "NOW" },
                      { to: "/categories" as const, label: "All Products", Icon: ShoppingBag, grad: "from-indigo-500 to-blue-600" },
                      { to: "/products" as const, label: "Categories", Icon: Package, grad: "from-amber-400 to-orange-600" },
                      { to: "/education" as const, label: "Education", Icon: GraduationCap, grad: "from-violet-400 to-fuchsia-600" },
                      { to: "/faq" as const, label: "FAQ", Icon: HelpCircle, grad: "from-rose-400 to-pink-600" },
                      { to: "/contact" as const, label: "Contact", Icon: PhoneCall, grad: "from-emerald-400 to-teal-600" },
                    ].map(({ to, label, Icon, grad, badge }) => (
                      <Link
                        key={label}
                        to={to}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white border border-violet-200/70 hover:border-violet-400 hover:bg-violet-50 transition active:scale-[0.98] shadow-[0_4px_14px_-10px_rgba(124,58,237,0.25)]"
                      >
                        <span className={`grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br ${grad} text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.4)] ring-1 ring-white/40 shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 text-slate-800 text-[14px] font-bold">{label}</span>
                        {badge && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 border border-violet-300 text-[9px] font-extrabold text-violet-700 tracking-wider">
                            {badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-violet-400 group-hover:text-violet-700 transition" />
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Footer CTAs */}
                <div className="pt-2">
                  {user ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white text-[13px] font-extrabold shadow-[0_14px_30px_-12px_rgba(168,85,247,0.5)] active:scale-[0.98] transition"
                      >
                        <Sparkles className="w-4 h-4" /> Dashboard
                      </Link>
                      <button
                        onClick={async () => {
                          setOpen(false);
                          await handleLogout();
                        }}
                        className="inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-rose-50 border border-rose-300 text-rose-600 text-[13px] font-extrabold hover:bg-rose-100 transition"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/register"
                        onClick={() => { rememberReturnTo(); setOpen(false); }}
                        className="inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white text-[13px] font-extrabold shadow-[0_14px_30px_-12px_rgba(168,85,247,0.5)] active:scale-[0.98] transition"
                      >
                        <Sparkles className="w-4 h-4" /> Get Started
                      </Link>
                      <Link
                        to="/login"
                        onClick={() => { rememberReturnTo(); setOpen(false); }}
                        className="inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-white border border-violet-300 text-violet-700 text-[13px] font-extrabold hover:bg-violet-50 transition"
                      >
                        <LogIn className="w-4 h-4" /> Login
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MagneticNav() {
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeIndex = NAV.findIndex((n) =>
    n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)
  );

  // Position pill on the active item / hovered item
  useLayoutEffect(() => {
    const targetIdx = hoverIndex ?? activeIndex;
    const el = targetIdx >= 0 ? itemRefs.current[targetIdx] : null;
    const nav = navRef.current;
    if (!el || !nav) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill({ left: r.left - navRect.left, width: r.width, visible: true });
  }, [hoverIndex, activeIndex, location.pathname]);

  // Recompute on resize
  useEffect(() => {
    const onResize = () => {
      const targetIdx = hoverIndex ?? activeIndex;
      const el = targetIdx >= 0 ? itemRefs.current[targetIdx] : null;
      const nav = navRef.current;
      if (!el || !nav) return;
      const navRect = nav.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPill({ left: r.left - navRect.left, width: r.width, visible: true });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hoverIndex, activeIndex]);

  // Mouse tracking on the nav container — magnet to nearest item
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const x = e.clientX;
    let nearest = 0;
    let nearestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    if (nearest !== hoverIndex) setHoverIndex(nearest);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  return (
    <nav
      ref={navRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="site-nav-pill hidden lg:flex relative items-center h-14 rounded-full border border-[#e4e7ff] font-semibold min-w-0 whitespace-nowrap"
      style={{
        gap: "clamp(2px, 0.3vw, 6px)",
        paddingLeft: "clamp(10px, 0.9vw, 18px)",
        paddingRight: "clamp(10px, 0.9vw, 18px)",
        fontSize: "clamp(13px, 0.95vw, 15px)",
        background: "#ffffff",
        boxShadow: "0 6px 18px -10px rgba(79,70,229,0.22)",
      }}
    >
      {/* Sliding pill — light lavender with purple border (reference style) */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-11 rounded-full transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          left: pill.left,
          width: pill.width,
          opacity: pill.visible ? 1 : 0,
          background: "#eef0ff",
          border: "1.5px solid #a5b0ff",
        }}
      />
      {NAV.map((n, i) => {
        const isActive = i === activeIndex;
        return (
          <Link
            key={n.to}
            to={n.to}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`relative z-10 py-2.5 rounded-full transition-colors whitespace-nowrap shrink-0 ${
              isActive ? "text-[#4f46e5]" : "text-slate-700 hover:text-[#4f46e5]"
            }`}
            style={{
              paddingLeft: "clamp(12px, 1.2vw, 22px)",
              paddingRight: "clamp(12px, 1.2vw, 22px)",
            }}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
