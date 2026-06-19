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
  const serverConfirmedRef = useRef(false);

  // Initial mount: prefer the user's saved theme. Do NOT use cached availability
  // to override it — cache may be stale and would clobber the user's choice.
  useEffect(() => {
    let stored: ThemeId | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) stored = saved;
    } catch { /* ignore */ }
    let initial: ThemeId;
    if (stored) {
      initial = stored;
      userPickedRef.current = true;
    } else {
      const initialAvail = getCachedAvailability();
      const initialDefault = getCachedDefaultTheme();
      initial = initialAvail[initialDefault] ? initialDefault : "white";
    }
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  // Mark when fresh server data arrives so we know it's safe to enforce fallback.
  useEffect(() => {
    const handler = () => { serverConfirmedRef.current = true; };
    window.addEventListener("anbd:theme-availability", handler);
    return () => window.removeEventListener("anbd:theme-availability", handler);
  }, []);

  // Only force fallback once we have CONFIRMED server data showing the current
  // theme is actually disabled. Never overwrite the user's stored choice during
  // fallback — they keep their pick, we just temporarily render the fallback.
  useEffect(() => {
    if (!serverConfirmedRef.current) return;
    if (availability[theme]) return;
    const next = availability[defaultTheme] ? defaultTheme : "white";
    if (next === theme) return;
    applyTheme(next);
    setThemeState(next);
  }, [availability, defaultTheme, theme]);

  const setTheme = useCallback((id: ThemeId) => {
    if (!THEMES.some((t) => t.id === id)) return;
    if (serverConfirmedRef.current && !availability[id]) return; // blocked
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
