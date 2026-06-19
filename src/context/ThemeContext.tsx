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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { availability, defaultTheme } = useThemeAvailability();
  const [theme] = useState<ThemeId>("white");

  // Force white theme on mount and clean any stored override.
  useEffect(() => {
    applyTheme("white");
    try { localStorage.setItem(STORAGE_KEY, "white"); } catch { /* ignore */ }
  }, []);

  const setTheme = useCallback((_id: ThemeId) => {
    // Only the white theme is supported.
    applyTheme("white");
  }, []);

  const enabledThemes = useMemo(() => THEMES, []);

  const value = useMemo(
    () => ({ theme, themes: THEMES, availability, defaultTheme, enabledThemes, setTheme }),
    [theme, availability, defaultTheme, enabledThemes, setTheme],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
