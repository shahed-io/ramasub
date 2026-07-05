import { useEffect, useState } from "react";
import { getSeoSettings, type SeoSettings, DEFAULT_SEO_SETTINGS } from "@/lib/seo-settings.functions";

/**
 * Loads admin-configured SEO settings client-side and injects:
 * - search engine verification meta tags
 * - Google Analytics 4 / Google Tag Manager scripts
 *
 * Safe no-op on admin pages and during SSR.
 */
export function SeoHead({ pathname }: { pathname: string }) {
  const [s, setS] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const isAdmin = pathname.startsWith("/Mahbub214");

  useEffect(() => {
    if (isAdmin) return;
    getSeoSettings().then(setS).catch(() => {});
  }, [isAdmin]);

  // Inject GA4
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAdmin) return;
    const id = s.ga4_measurement_id?.trim();
    if (!id || !/^G-/i.test(id)) return;
    if (document.querySelector(`script[data-ga4="${id}"]`)) return;

    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    loader.setAttribute("data-ga4", id);
    document.head.appendChild(loader);

    const init = document.createElement("script");
    init.setAttribute("data-ga4-init", id);
    init.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${id}');`;
    document.head.appendChild(init);
  }, [s.ga4_measurement_id, isAdmin]);

  // Inject GTM
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAdmin) return;
    const id = s.google_tag_manager_id?.trim();
    if (!id || !/^GTM-/i.test(id)) return;
    if (document.querySelector(`script[data-gtm="${id}"]`)) return;

    const tag = document.createElement("script");
    tag.setAttribute("data-gtm", id);
    tag.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
    document.head.appendChild(tag);
  }, [s.google_tag_manager_id, isAdmin]);

  // Inject verification meta tags into <head> imperatively (so they appear in SSR'd HTML too once cached)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const mounts: Array<{ name: string; content: string }> = [];
    if (s.google_site_verification) mounts.push({ name: "google-site-verification", content: s.google_site_verification });
    if (s.bing_site_verification) mounts.push({ name: "msvalidate.01", content: s.bing_site_verification });
    if (s.yandex_site_verification) mounts.push({ name: "yandex-verification", content: s.yandex_site_verification });
    if (s.facebook_domain_verification) mounts.push({ name: "facebook-domain-verification", content: s.facebook_domain_verification });

    const created: HTMLMetaElement[] = [];
    for (const m of mounts) {
      if (document.querySelector(`meta[name="${m.name}"]`)) continue;
      const el = document.createElement("meta");
      el.name = m.name;
      el.content = m.content;
      document.head.appendChild(el);
      created.push(el);
    }
    return () => {
      for (const el of created) el.remove();
    };
  }, [s.google_site_verification, s.bing_site_verification, s.yandex_site_verification, s.facebook_domain_verification]);

  return null;
}
