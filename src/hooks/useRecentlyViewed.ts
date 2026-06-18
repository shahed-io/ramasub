import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently_viewed_v1";
const MAX_ITEMS = 12;

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((s) => typeof s === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeStore(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent("recently-viewed:change"));
  } catch {
    /* ignore */
  }
}

/** Record a slug as just viewed (most-recent first, dedup). */
export function recordRecentlyViewed(slug: string) {
  if (!slug) return;
  const current = readStore();
  const next = [slug, ...current.filter((s) => s !== slug)].slice(0, MAX_ITEMS);
  writeStore(next);
}

/** Hook returning recently viewed slugs (live-updating across the app). */
export function useRecentlyViewedSlugs(): {
  slugs: string[];
  clear: () => void;
} {
  // Start empty so SSR and client first render match — hydrate from
  // localStorage in useEffect to avoid hydration mismatches.
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSlugs(readStore());
    const sync = () => setSlugs(readStore());
    window.addEventListener("storage", sync);
    window.addEventListener("recently-viewed:change", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("recently-viewed:change", sync as EventListener);
    };
  }, []);


  const clear = useCallback(() => {
    writeStore([]);
  }, []);

  return { slugs, clear };
}
