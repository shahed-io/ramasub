import { useEffect } from "react";
import { installErrorLogger } from "@/lib/error-logger";
import { startScrollPerfMonitor } from "@/lib/scrollPerfMonitor";
import { registerServiceWorker } from "@/lib/registerSW";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ShopConfigProvider } from "@/context/ShopConfigContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { SupportWidget } from "@/components/SupportWidget";
import { SiteHeader } from "@/components/SiteHeader";
import { WelcomePopup } from "@/components/WelcomePopup";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { TrackingScripts } from "@/components/TrackingScripts";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SeoHead } from "@/components/SeoHead";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="page_404 flex min-h-screen items-center justify-center bg-[#0b0b0f] px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white px-6 py-12 shadow-2xl sm:px-12 sm:py-16">
        <div className="text-center">
          <h1
            className="text-[80px] leading-none font-normal text-[#222]"
            style={{ fontFamily: "'Arvo', Georgia, 'Times New Roman', serif" }}
          >
            404
          </h1>

          {/* Illustration */}
          <div className="mx-auto mt-6 flex h-56 w-full max-w-lg items-end justify-center gap-6 sm:h-64">
            <svg viewBox="0 0 480 220" className="h-full w-full" aria-hidden="true">
              {/* ground */}
              <ellipse cx="240" cy="205" rx="220" ry="10" fill="#f1f2f4" />
              {/* left rock stack */}
              <ellipse cx="90" cy="200" rx="46" ry="10" fill="#e6e8ec" />
              <path d="M60 200 Q70 150 90 148 Q112 150 120 200 Z" fill="#d5d8df" />
              <path d="M72 148 Q90 118 108 148 Z" fill="#c9cdd4" />
              {/* right rock */}
              <ellipse cx="400" cy="200" rx="60" ry="10" fill="#e6e8ec" />
              <path d="M350 200 Q360 130 400 128 Q440 132 450 200 Z" fill="#d5d8df" />
              {/* bushes */}
              <path d="M140 200 q10 -22 22 -22 q6 -14 20 -12 q10 -14 22 -6 q14 -4 18 12 q10 6 6 28 Z" fill="#2fb14a" />
              <path d="M300 200 q8 -18 20 -18 q6 -12 18 -10 q8 -12 20 -4 q12 -2 14 10 q10 4 6 22 Z" fill="#2fb14a" />
              {/* character body */}
              <g>
                {/* legs */}
                <rect x="220" y="160" width="14" height="34" rx="4" fill="#f2b28a" />
                <rect x="246" y="160" width="14" height="34" rx="4" fill="#f2b28a" />
                {/* tunic */}
                <path d="M204 120 L276 120 L282 172 L198 172 Z" fill="#f6a623" />
                <circle cx="222" cy="140" r="4" fill="#c97b13" />
                <circle cx="252" cy="150" r="4" fill="#c97b13" />
                <circle cx="238" cy="128" r="3.5" fill="#c97b13" />
                {/* arms */}
                <rect x="192" y="128" width="14" height="40" rx="6" fill="#f2b28a" />
                <rect x="274" y="128" width="14" height="40" rx="6" fill="#f2b28a" />
                {/* head */}
                <circle cx="240" cy="96" r="26" fill="#f2b28a" />
                {/* hair */}
                <path d="M216 92 Q220 66 240 64 Q262 66 264 92 Q252 82 240 84 Q228 82 216 92 Z" fill="#5b3a1e" />
                {/* beard */}
                <path d="M222 100 Q240 130 258 100 Q256 118 240 122 Q224 118 222 100 Z" fill="#5b3a1e" />
                {/* eyes */}
                <circle cx="232" cy="96" r="2" fill="#222" />
                <circle cx="248" cy="96" r="2" fill="#222" />
                {/* cable in hands */}
                <path d="M198 168 C 170 190, 150 150, 168 138" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" />
                <rect x="160" y="130" width="14" height="10" rx="2" fill="#222" />
                <path d="M282 168 C 310 190, 330 150, 316 140" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" />
                <rect x="308" y="132" width="14" height="10" rx="2" fill="#222" />
              </g>
            </svg>
          </div>

          <h2
            className="mt-8 text-2xl font-normal text-[#333]"
            style={{ fontFamily: "'Arvo', Georgia, serif" }}
          >
            Look like you're lost
          </h2>
          <p className="mt-2 text-sm text-[#777]">
            the page you are looking for not avaible!
          </p>

          <div className="mt-8">
            <Link
              to="/"
              className="inline-block rounded-md bg-[#39ac31] px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2f9528]"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google-site-verification", content: "CgMIuFpLAgJI90GWhi4UoO30b3KFiKQAt54OKY6W_3g" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f1b3d" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Rama Sub" },
      { name: "application-name", content: "Rama Sub" },
      { title: "Rama Sub — ramasub.com | Premium Subscriptions Bangladesh (রামা সাব)" },
      { name: "description", content: "Rama Sub (ramasub.com) — Bangladesh's #1 trusted shop for ChatGPT Plus, Netflix, Canva Pro, Adobe, Office 365, VPN ও premium subscriptions। Instant delivery, warranty ও 24/7 support। রামা সাব থেকে সবচেয়ে কম দামে verified digital products কিনুন।" },
      { name: "keywords", content: "Rama Sub, ramasub, ramasub.com, রামা সাব, Rama Sub Bangladesh, Rama Sub BD, premium subscription Bangladesh, ChatGPT Plus BD, Netflix Bangladesh, Canva Pro BD, Adobe subscription BD, Office 365 Bangladesh, digital products Bangladesh, subscription shop BD" },
      { name: "author", content: "Rama Sub" },
      // Sitewide Open Graph defaults — page-specific og:title / og:description /
      // og:image / og:url MUST be set on the leaf route. We intentionally do NOT
      // declare og:image here: TanStack head() concatenates root meta into every
      // match, and a root og:image would override every leaf's own preview.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Rama Sub" },
      { property: "og:locale", content: "bn_BD" },
      { property: "og:locale:alternate", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@ramasub" },
      { property: "og:title", content: "Rama Sub | Trusted Digital Services in Bangladesh" },
      { name: "twitter:title", content: "Rama Sub | Trusted Digital Services in Bangladesh" },
      { property: "og:description", content: "Rama Sub provides digital products, premium subscriptions, hosting, software, with fast support and secure access across Bangladesh." },
      { name: "twitter:description", content: "Rama Sub provides digital products, premium subscriptions, hosting, software, with fast support and secure access across Bangladesh." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/de062542-a538-4372-9e7f-f1f51d5bc8b0" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/de062542-a538-4372-9e7f-f1f51d5bc8b0" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=8" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png?v=8" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=8" },
      { rel: "icon", type: "image/png", href: "/favicon.png?v=8" },
      { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico?v=8" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png?v=8" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png?v=8" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png?v=8", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-white" data-theme="white">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/Mahbub214");

  useEffect(() => {
    installErrorLogger();
    registerServiceWorker();
    const stopPerf = startScrollPerfMonitor();
    return () => {
      stopPerf();
    };
  }, []);

  // First-party web analytics — track every public route change
  useEffect(() => {
    if (isAdmin) return;
    import("@/lib/analytics-tracker").then((m) => m.trackPageview(pathname));
  }, [pathname, isAdmin]);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <ShopConfigProvider>
              <CurrencyProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
              >
                মূল কন্টেন্টে যান
              </a>
              {!isAdmin && <SiteHeader />}
              <main id="main-content">
                <Outlet />
              </main>
              {!isAdmin && <SupportWidget />}
              {!isAdmin && <WelcomePopup />}
              {!isAdmin && <InstallAppPrompt />}
              {!isAdmin && <TrackingScripts />}
              {!isAdmin && <GoogleAnalytics />}
              <SeoHead pathname={pathname} />


              </CurrencyProvider>
            </ShopConfigProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RealtimeBridge() {
  useRealtimeSync();
  return null;
}
