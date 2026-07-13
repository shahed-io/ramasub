/**
 * First-party web analytics tracker. Sends page views to /api/public/track-pageview.
 * Skips admin routes, bots, and prerender/SSR.
 */

const SESSION_KEY = "rs_an_sid";
const VISITOR_KEY = "rs_an_vid";
const LAST_HIT_KEY = "rs_an_last";
const SESSION_TTL_MS = 30 * 60_000; // 30 min

function rand(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent || "";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent || "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent || "";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function isBot(): boolean {
  const ua = (navigator.userAgent || "").toLowerCase();
  return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pingdom|gtmetrix/i.test(ua);
}

function getOrCreateVisitorId(): { id: string; isNew: boolean } {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return { id: existing, isNew: false };
    const fresh = rand();
    localStorage.setItem(VISITOR_KEY, fresh);
    return { id: fresh, isNew: true };
  } catch {
    return { id: rand(), isNew: true };
  }
}

function getOrCreateSessionId(): { id: string; isNew: boolean } {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(SESSION_KEY);
    const last = Number(sessionStorage.getItem(LAST_HIT_KEY) || 0);
    if (raw && now - last < SESSION_TTL_MS) {
      sessionStorage.setItem(LAST_HIT_KEY, String(now));
      return { id: raw, isNew: false };
    }
    const fresh = rand();
    sessionStorage.setItem(SESSION_KEY, fresh);
    sessionStorage.setItem(LAST_HIT_KEY, String(now));
    return { id: fresh, isNew: true };
  } catch {
    return { id: rand(), isNew: true };
  }
}

let lastPath = "";
let lastSentAt = 0;

export function trackPageview(pathname: string): void {
  if (typeof window === "undefined") return;
  if (isBot()) return;
  if (pathname.startsWith("/Mahbub214")) return; // never track admin
  if (pathname.startsWith("/api/")) return;

  // dedupe rapid double-fires (React strict mode etc.)
  const now = Date.now();
  if (pathname === lastPath && now - lastSentAt < 1500) return;
  lastPath = pathname;
  lastSentAt = now;

  const visitor = getOrCreateVisitorId();
  const session = getOrCreateSessionId();

  const params = new URLSearchParams(window.location.search);

  const body = {
    session_id: session.id,
    visitor_id: visitor.id,
    is_new_session: session.isNew,
    is_new_visitor: visitor.isNew,
    path: pathname,
    full_url: window.location.href,
    referrer: document.referrer || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    device: detectDevice(),
    browser: detectBrowser(),
    os: detectOS(),
    screen_size: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    language: navigator.language || null,
  };

  try {
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/public/track-pageview", blob);
    } else {
      fetch("/api/public/track-pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
