import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const COUNTRY_NAMES: Record<string, string> = {
  BD: "Bangladesh", IN: "India", PK: "Pakistan", US: "United States", GB: "United Kingdom",
  CA: "Canada", AU: "Australia", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain",
  NL: "Netherlands", SE: "Sweden", NO: "Norway", FI: "Finland", DK: "Denmark", PL: "Poland",
  RU: "Russia", UA: "Ukraine", TR: "Turkey", SA: "Saudi Arabia", AE: "UAE", QA: "Qatar",
  KW: "Kuwait", OM: "Oman", BH: "Bahrain", EG: "Egypt", MA: "Morocco", NG: "Nigeria",
  KE: "Kenya", ZA: "South Africa", BR: "Brazil", MX: "Mexico", AR: "Argentina", CL: "Chile",
  CO: "Colombia", JP: "Japan", CN: "China", KR: "South Korea", TW: "Taiwan", HK: "Hong Kong",
  SG: "Singapore", MY: "Malaysia", TH: "Thailand", VN: "Vietnam", PH: "Philippines",
  ID: "Indonesia", NP: "Nepal", LK: "Sri Lanka", MM: "Myanmar", BT: "Bhutan", MV: "Maldives",
  AF: "Afghanistan", IR: "Iran", IQ: "Iraq", IL: "Israel", JO: "Jordan", LB: "Lebanon",
  SY: "Syria", YE: "Yemen", NZ: "New Zealand", IE: "Ireland", PT: "Portugal", CH: "Switzerland",
  AT: "Austria", BE: "Belgium", CZ: "Czechia", GR: "Greece", HU: "Hungary", RO: "Romania",
};

function referrerHost(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/track-pageview")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const { guardPublicRoute, tooManyRequests } = await import("@/lib/rate-limit.server");
          const rl = await guardPublicRoute("public.track_pageview", request);
          if (!rl.allowed) return tooManyRequests(rl, CORS);

          const body = await request.json().catch(() => null) as Record<string, unknown> | null;
          if (!body || typeof body.path !== "string" || typeof body.session_id !== "string") {
            return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "content-type": "application/json", ...CORS } });
          }

          // basic length guards
          const clip = (v: unknown, n = 512) =>
            typeof v === "string" && v.length > 0 ? v.slice(0, n) : null;

          const country = (request.headers.get("cf-ipcountry") || "").toUpperCase() || null;
          const city = request.headers.get("cf-ipcity") || null;
          const region = request.headers.get("cf-region") || null;
          const ipRaw =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "";
          const salt = process.env.META_ENCRYPTION_KEY || "rs-analytics-salt";
          const ipHash = ipRaw ? (await sha256(ipRaw + "|" + salt)).slice(0, 24) : null;

          const path = clip(body.path, 512)!;
          if (path.startsWith("/Mahbub214") || path.startsWith("/api/")) {
            return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { "content-type": "application/json", ...CORS } });
          }

          const ref = clip(body.referrer, 1024);
          const row = {
            session_id: clip(body.session_id, 64)!,
            visitor_id: clip(body.visitor_id, 64),
            path,
            full_url: clip(body.full_url, 2000),
            referrer: ref,
            referrer_host: referrerHost(ref),
            utm_source: clip(body.utm_source, 128),
            utm_medium: clip(body.utm_medium, 128),
            utm_campaign: clip(body.utm_campaign, 128),
            utm_term: clip(body.utm_term, 128),
            utm_content: clip(body.utm_content, 128),
            country,
            country_name: country ? COUNTRY_NAMES[country] || country : null,
            city: clip(city, 128),
            region: clip(region, 128),
            device: clip(body.device, 32),
            browser: clip(body.browser, 32),
            os: clip(body.os, 32),
            user_agent: clip(request.headers.get("user-agent"), 512),
            screen_size: clip(body.screen_size, 32),
            language: clip(body.language, 32),
            is_new_session: Boolean(body.is_new_session),
            is_new_visitor: Boolean(body.is_new_visitor),
            ip_hash: ipHash,
          };

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("web_analytics_events").insert(row);

          return new Response(JSON.stringify({ ok: true }), {
            headers: { "content-type": "application/json", ...CORS },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "content-type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
