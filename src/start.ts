import { createStart, createMiddleware } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Redirect middleware: 301/302 from admin-managed `redirects` table.
// Cached in-memory for 60s to avoid hitting the DB on every request.
// ─────────────────────────────────────────────────────────────────────
type RedirectRow = { from_path: string; to_path: string; status_code: number };
let redirectCache: { map: Map<string, RedirectRow>; expires: number } | null = null;
const REDIRECT_TTL_MS = 60_000;

async function loadRedirects(): Promise<Map<string, RedirectRow>> {
  const now = Date.now();
  if (redirectCache && redirectCache.expires > now) return redirectCache.map;
  const map = new Map<string, RedirectRow>();
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await sb
        .from("redirects" as never)
        .select("from_path, to_path, status_code")
        .eq("is_active", true);
      if (data) {
        for (const r of data as RedirectRow[]) {
          if (r.from_path && r.to_path) map.set(r.from_path, r);
        }
      }
    }
  } catch (e) {
    console.error("[redirects] load failed", e);
  }
  redirectCache = { map, expires: now + REDIRECT_TTL_MS };
  return map;
}

function normalize(p: string): string {
  if (!p) return "/";
  let v = p;
  // strip trailing slash except root
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

const redirectMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    const url = new URL(request.url);
    // Skip non-GET, static assets, and internal endpoints
    if (request.method !== "GET" && request.method !== "HEAD") return next();
    const pathname = url.pathname;
    if (
      pathname.startsWith("/_") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/images/") ||
      pathname.startsWith("/banners/") ||
      pathname.includes(".")
    ) {
      return next();
    }

    const map = await loadRedirects();
    const hit = map.get(normalize(pathname));
    if (hit) {
      const target = /^https?:\/\//i.test(hit.to_path)
        ? hit.to_path
        : `${url.origin}${hit.to_path}${url.search}`;
      return new Response(null, {
        status: hit.status_code,
        headers: { Location: target },
      });
    }
  } catch (e) {
    console.error("[redirects] middleware error", e);
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, redirectMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
