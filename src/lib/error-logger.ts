// Client-side automatic error logger.
// Captures window errors, unhandled promise rejections, and console.error,
// then ships them to /api/public/client-errors (rate-limited & deduped).

let installed = false;
const seen = new Map<string, number>();
const MAX_PER_MIN = 20;
let sentThisMinute = 0;
let minuteStart = Date.now();

function shouldSend(key: string) {
  const now = Date.now();
  if (now - minuteStart > 60_000) {
    minuteStart = now;
    sentThisMinute = 0;
  }
  if (sentThisMinute >= MAX_PER_MIN) return false;
  const last = seen.get(key) ?? 0;
  if (now - last < 5_000) return false; // dedupe identical errors within 5s
  seen.set(key, now);
  sentThisMinute++;
  return true;
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    const url = "/api/public/client-errors";
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}

function basePayload() {
  return {
    url: typeof location !== "undefined" ? location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  };
}

export function installErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const message = event.message || String(event.error?.message ?? "Unknown error");
    const stack = event.error?.stack as string | undefined;
    const key = `error:${message}:${event.filename}:${event.lineno}`;
    if (!shouldSend(key)) return;
    send({
      type: "error",
      message,
      stack,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      ...basePayload(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason?.message || JSON.stringify(reason)?.slice(0, 500) || "Unhandled rejection";
    const stack = reason?.stack as string | undefined;
    const key = `rejection:${message}`;
    if (!shouldSend(key)) return;
    send({ type: "unhandledrejection", message, stack, ...basePayload() });
  });

  // Wrap console.error to forward (without breaking original output)
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    try {
      const message = args
        .map((a) => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ")
        .slice(0, 2000);
      const key = `console:${message}`;
      if (!shouldSend(key)) return;
      send({ type: "console.error", message, ...basePayload() });
    } catch {
      /* swallow */
    }
  };
}
