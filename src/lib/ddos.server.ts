/**
 * Application-level DDoS shield (Cloudflare-style, but in-app).
 *
 * Runs as request middleware on every non-asset request:
 *  - a per-isolate in-memory counter is the first line of defence (zero DB cost
 *    for normal traffic),
 *  - every Nth request the count is flushed into the admin-configurable
 *    `ddos.burst.ip` / `ddos.global.ip` rules, which apply exponential backoff
 *    and record a block row visible in Admin → Rate Limits.
 *
 * Fails OPEN: any internal error lets the request through so the shield can
 * never take the shop offline.
 */
import { clientIp, consume, type RateLimitVerdict } from "@/lib/rate-limit.server";

const FLUSH_EVERY = 10;

type Bucket = { pending: number; blockedUntil: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [ip, b] of buckets) {
    if (b.pending === 0 && b.blockedUntil < now) buckets.delete(ip);
  }
  if (buckets.size > 20_000) buckets.clear();
}

export function isShieldedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/_build") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/banners/") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest"
  ) {
    return false;
  }
  if (/\.(png|jpe?g|webp|svg|gif|ico|css|js|mjs|map|woff2?|ttf)$/i.test(pathname)) return false;
  return true;
}

function blockResponse(retryAfter: number): Response {
  const secs = Math.max(1, retryAfter || 60);
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Too many requests</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5ff;font-family:ui-sans-serif,system-ui,-apple-system,"Space Grotesk",sans-serif;color:#1e1b4b}
.card{max-width:460px;padding:36px 32px;background:#fff;border:1px solid #ede9fe;border-radius:18px;box-shadow:0 18px 50px -24px rgba(76,29,149,.35);text-align:center}
h1{margin:0 0 10px;font-size:22px}p{margin:0 0 6px;color:#4c1d95;font-size:14px;line-height:1.6}
.badge{display:inline-flex;margin-bottom:14px;padding:6px 12px;border-radius:999px;background:#f5f3ff;color:#6d28d9;font-size:12px;font-weight:600}
</style></head><body><div class="card"><span class="badge">Rama Sub • Security Shield</span>
<h1>Too many requests</h1>
<p>আমাদের সিস্টেম অস্বাভাবিক ট্রাফিক শনাক্ত করেছে। অনুগ্রহ করে ${secs} সেকেন্ড পরে আবার চেষ্টা করুন।</p>
<p>Unusual traffic detected from your network. Please retry in ${secs} seconds.</p>
</div></body></html>`,
    {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": String(secs),
        "cache-control": "no-store",
      },
    },
  );
}

/** Returns a 429 Response when the client must be throttled, otherwise null. */
export async function ddosGuard(request: Request): Promise<Response | null> {
  try {
    const url = new URL(request.url);
    if (!isShieldedPath(url.pathname)) return null;

    const { loadBotSettings } = await import("@/lib/bot-shield.server");
    const settings = await loadBotSettings();
    if (!settings.ddos_enabled) return null;

    const now = Date.now();
    sweep(now);
    const ip = clientIp(request);
    if (ip === "unknown") return null;

    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { pending: 0, blockedUntil: 0 };
      buckets.set(ip, bucket);
    }

    if (bucket.blockedUntil > now) {
      return blockResponse(Math.ceil((bucket.blockedUntil - now) / 1000));
    }

    bucket.pending += 1;
    if (bucket.pending < FLUSH_EVERY) return null;

    const cost = bucket.pending;
    bucket.pending = 0;

    const identifier = `ip:${ip}`;
    const verdicts: RateLimitVerdict[] = await Promise.all([
      consume("ddos.burst.ip", identifier, cost),
      consume("ddos.global.ip", identifier, cost),
    ]);
    const denied = verdicts.filter((v) => !v.allowed);
    if (denied.length === 0) return null;

    const worst = denied.reduce((a, b) => (b.retryAfter > a.retryAfter ? b : a), denied[0]!);
    bucket.blockedUntil = now + Math.max(1, worst.retryAfter) * 1000;
    return blockResponse(worst.retryAfter);
  } catch (e) {
    console.warn("[ddos] guard error", e);
    return null;
  }
}
