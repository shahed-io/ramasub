import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

// GA4 Measurement ID for Rama Sub
const GA_MEASUREMENT_ID = "G-W3YHYYKHY8";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let injected = false;

function injectGtag() {
  if (injected || typeof window === "undefined") return;
  injected = true;

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(loader);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag as typeof window.gtag;
  gtag("js", new Date());
  // send_page_view false — we'll fire page_view manually on route changes
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

/**
 * Google Analytics 4 loader. Runs client-only, injects gtag once,
 * and fires a `page_view` event on every route change (SPA-safe).
 * Admin pages (/Mahbub214/*) are excluded.
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/Mahbub214")) return;
    injectGtag();

    // Fire page_view after route commit
    const t = setTimeout(() => {
      if (typeof window.gtag !== "function") return;
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
        send_to: GA_MEASUREMENT_ID,
      });
    }, 150);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
