// Guarded service-worker registration.
// Never registers in dev, Lovable preview, iframes, or when ?sw=off is set.
// Unregisters any matching /sw.js in those refused contexts so stale workers
// from a prior environment can't keep serving cached HTML.

const SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  // Vite dev / non-prod build → never register.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env;
  if (!env?.PROD) return true;
  if (window.top !== window.self) return true;
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") {
    return true;
  }
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL;
          return !!url && new URL(url).pathname === SW_PATH;
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    void unregisterMatching();
    return;
  }

  // Defer until the page is idle so we don't fight first paint.
  const start = () => {
    navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch((err) => {
      console.warn("[sw] registration failed", err);
    });
  };
  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}
