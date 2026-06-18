import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getCachedAvailability, getCachedDefaultTheme, useThemeAvailability, type ThemeAvailability } from "@/hooks/useThemeAvailability";

export type ThemeId = "aurora" | "white";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  className: string;
  swatch: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Premium dark glass with violet · cyan · pink aurora",
    className: "",
    swatch: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 55%, #EC4899 100%)",
  },
  {
    id: "white",
    name: "White",
    description: "Clean light theme — bright surfaces, soft shadows",
    className: "theme-white",
    swatch: "linear-gradient(135deg, #ffffff 0%, #e5e7eb 55%, #cbd5e1 100%)",
  },
];

const STORAGE_KEY = "anbd-theme";
const ALL_CLASSES = THEMES.map((t) => t.className).filter(Boolean);

type Ctx = {
  theme: ThemeId;
  themes: ThemeMeta[];
  availability: ThemeAvailability;
  defaultTheme: ThemeId;
  enabledThemes: ThemeMeta[];
  setTheme: (id: ThemeId) => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: "white",
  themes: THEMES,
  availability: { aurora: true, white: true },
  defaultTheme: "white",
  enabledThemes: THEMES,
  setTheme: () => {},
});

function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  const found = THEMES.find((t) => t.id === id);
  if (found?.className) root.classList.add(found.className);
  root.dataset.theme = id;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { availability, defaultTheme } = useThemeAvailability();
  const [theme, setThemeState] = useState<ThemeId>("white");
  const userPickedRef = useRef(false);

  // Initial mount: load stored theme if user picked one; else use admin default.
  useEffect(() => {
    let stored: ThemeId | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) stored = saved;
    } catch { /* ignore */ }
    const initialAvail = getCachedAvailability();
    const initialDefault = getCachedDefaultTheme();
    let initial: ThemeId;
    if (stored && initialAvail[stored]) {
      initial = stored;
      userPickedRef.current = true;
    } else {
      initial = initialAvail[initialDefault] ? initialDefault : "white";
    }
    applyTheme(initial);
    setThemeState(initial);
    try { localStorage.setItem(STORAGE_KEY, initial); } catch { /* ignore */ }
    userPickedRef.current = true;
  }, []);

  // When availability changes (admin toggled), force fallback if needed.
  useEffect(() => {
    if (!availability[theme]) {
      const next = availability[defaultTheme] ? defaultTheme : "white";
      applyTheme(next);
      setThemeState(next);
      if (userPickedRef.current) {
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      }
    }
  }, [availability, defaultTheme, theme]);

  // Note: we intentionally do NOT auto-follow admin default theme changes after mount.
  // Once a visitor lands on the site, their active theme stays put unless they pick a new
  // one or the current theme is disabled by an admin (handled in the fallback effect above).

  const setTheme = useCallback((id: ThemeId) => {
    if (!THEMES.some((t) => t.id === id)) return;
    if (!availability[id]) return; // blocked
    applyTheme(id);
    setThemeState(id);
    userPickedRef.current = true;
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }, [availability]);

  const enabledThemes = useMemo(() => THEMES.filter((t) => availability[t.id]), [availability]);

  const value = useMemo(
    () => ({ theme, themes: THEMES, availability, defaultTheme, enabledThemes, setTheme }),
    [theme, availability, defaultTheme, enabledThemes, setTheme],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
