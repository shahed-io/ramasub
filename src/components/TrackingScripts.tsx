import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type PublicPixel = {
  id: string;
  provider: string;
  pixel_id: string | null;
  account_id: string | null;
  conversion_label: string | null;
  enabled: boolean;
  custom_script: string | null;
};

/**
 * Loads enabled tracking pixels from the public view and injects scripts.
 * Client-only — never runs during SSR, so no hydration mismatch.
 */
export function TrackingScripts() {
  const [pixels, setPixels] = useState<PublicPixel[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Don't load tracking on admin pages
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;

    let active = true;
    (async () => {
      const { data } = await supabase
        .from("tracking_pixels_public" as never)
        .select("id, provider, pixel_id, account_id, conversion_label, enabled, custom_script");
      if (!active || !data) return;
      setPixels(data as PublicPixel[]);
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  // Inject scripts when pixels load
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pixels.length === 0) return;

    for (const p of pixels) {
      if (p.provider === "facebook_pixel" && p.pixel_id) {
        injectFacebookPixel(p.pixel_id);
      } else if (p.provider === "google_ads" && p.pixel_id) {
        injectGoogleTag(p.pixel_id);
      } else if (p.provider === "other" && p.custom_script) {
        injectCustomScript(p.id, p.custom_script);
      }
    }
  }, [pixels]);

  // Fire PageView on route change once pixels are active
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;
    if (pixels.length === 0) return;
    // Small delay to ensure pixels finished initializing
    const t = setTimeout(() => trackEvent("PageView"), 200);
    return () => clearTimeout(t);
  }, [pathname, pixels.length]);

  return null;
}

const injected = new Set<string>();

function injectFacebookPixel(pixelId: string) {
  const key = `fbq:${pixelId}`;
  if (injected.has(key)) return;
  injected.add(key);

  if (window.fbq) {
    try {
      (window.fbq as unknown as (...args: unknown[]) => void)("init", pixelId);
      (window.fbq as unknown as (...args: unknown[]) => void)("track", "PageView");
    } catch {
      /* ignore */
    }
    return;
  }

  // Standard Meta Pixel snippet
  const script = document.createElement("script");
  script.innerHTML = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // noscript fallback
  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.head.appendChild(noscript);
}

function injectGoogleTag(tagId: string) {
  const key = `gtag:${tagId}`;
  if (injected.has(key)) return;
  injected.add(key);

  // gtag loader
  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(loader);

  const init = document.createElement("script");
  init.innerHTML = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${tagId}');
  `;
  document.head.appendChild(init);
}

function injectCustomScript(id: string, raw: string) {
  const key = `custom:${id}`;
  if (injected.has(key)) return;
  injected.add(key);

  const container = document.createElement("div");
  container.style.display = "none";
  container.setAttribute("data-pixel-id", id);
  container.innerHTML = raw;
  document.body.appendChild(container);

  // Re-execute any <script> tags inside the raw HTML (innerHTML doesn't run them)
  const scripts = container.querySelectorAll("script");
  scripts.forEach((old) => {
    const fresh = document.createElement("script");
    for (const attr of Array.from(old.attributes)) {
      fresh.setAttribute(attr.name, attr.value);
    }
    fresh.text = old.text;
    document.head.appendChild(fresh);
  });
}
