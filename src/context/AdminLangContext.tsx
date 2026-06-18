import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type AdminLang = "en" | "bn";
const STORAGE_KEY = "anbd:adminLang";

type Ctx = {
  lang: AdminLang;
  setLang: (l: AdminLang) => void;
  toggle: () => void;
  t: (en: string, bn?: string) => string;
};

const AdminLangCtx = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  toggle: () => {},
  t: (en) => en,
});

function readInitial(): AdminLang {
  if (typeof localStorage === "undefined") return "en";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => readInitial());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((l: AdminLang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((p) => (p === "en" ? "bn" : "en")), []);
  const t = useCallback(
    (en: string, bn?: string) => (lang === "bn" && bn ? bn : en),
    [lang],
  );

  return (
    <AdminLangCtx.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </AdminLangCtx.Provider>
  );
}

export const useAdminLang = () => useContext(AdminLangCtx);
