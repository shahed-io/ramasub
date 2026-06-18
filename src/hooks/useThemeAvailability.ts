import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ThemeId } from "@/context/ThemeContext";

export type ThemeAvailability = Record<ThemeId, boolean>;

const DEFAULTS: ThemeAvailability = { aurora: true, white: true };
const STORAGE_KEY = "anbd-theme-availability";
const DEFAULT_THEME_KEY = "anbd-theme-default";
const FALLBACK_DEFAULT: ThemeId = "white";

function readCache(): ThemeAvailability {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ThemeAvailability>) };
  } catch { return DEFAULTS; }
}

export function getCachedDefaultTheme(): ThemeId {
  if (typeof localStorage === "undefined") return FALLBACK_DEFAULT;
  try {
    const raw = localStorage.getItem(DEFAULT_THEME_KEY) as ThemeId | null;
    if (raw === "aurora" || raw === "white") return raw;
  } catch { /* ignore */ }
  return FALLBACK_DEFAULT;
}

async function fetchAll(): Promise<{ availability: ThemeAvailability; defaultTheme: ThemeId }> {
  const { data, error } = await supabase
    .from("admin_records")
    .select("kind,data,is_active")
    .in("kind", ["theme_config", "theme_default"]);
  if (error || !data) return { availability: DEFAULTS, defaultTheme: FALLBACK_DEFAULT };
  const availability: ThemeAvailability = { ...DEFAULTS };
  let defaultTheme: ThemeId = FALLBACK_DEFAULT;
  for (const row of data) {
    const id = (row.data as { id?: string } | null)?.id as ThemeId | undefined;
    if (row.kind === "theme_config" && id && id in availability) {
      availability[id] = !!row.is_active;
    } else if (row.kind === "theme_default" && id && (id === "aurora" || id === "white")) {
      defaultTheme = id;
    }
  }
  availability.white = true; // safe fallback always available
  if (!availability[defaultTheme]) defaultTheme = FALLBACK_DEFAULT;
  return { availability, defaultTheme };
}

export function useThemeAvailability(): { availability: ThemeAvailability; defaultTheme: ThemeId } {
  const [state, setState] = useState<{ availability: ThemeAvailability; defaultTheme: ThemeId }>(() => ({
    availability: readCache(),
    defaultTheme: getCachedDefaultTheme(),
  }));

  useEffect(() => {
    let alive = true;
    const apply = (next: { availability: ThemeAvailability; defaultTheme: ThemeId }) => {
      if (!alive) return;
      setState(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.availability));
        localStorage.setItem(DEFAULT_THEME_KEY, next.defaultTheme);
      } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("anbd:theme-availability", { detail: next }));
    };

    fetchAll().then(apply);

    const channel = supabase
      .channel("theme_config_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_records", filter: "kind=eq.theme_config" }, () => {
        fetchAll().then(apply);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_records", filter: "kind=eq.theme_default" }, () => {
        fetchAll().then(apply);
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

export function getCachedAvailability(): ThemeAvailability {
  return readCache();
}
