import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "BDT" | "USD";

export type CurrencyConfig = {
  usd_rate: number;
  enable_usd: boolean;
  usd_symbol: string;
  bdt_symbol: string;
};

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  usd_rate: 135,
  enable_usd: true,
  usd_symbol: "$",
  bdt_symbol: "৳",
};

const LS_KEY = "rama.currency";

type Ctx = {
  code: CurrencyCode;
  setCode: (c: CurrencyCode) => void;
  config: CurrencyConfig;
  symbol: string;
  /** Format a BDT numeric value into the active currency for display. */
  format: (bdt: number, opts?: { decimals?: number }) => string;
  /** Reformat a raw price string like "৳499+" or "499" preserving trailing "+" if present. */
  formatString: (input: string | number | undefined | null) => string;
};

const CurrencyCtx = createContext<Ctx | null>(null);

function extractNumber(s: string): number {
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

export function useCurrencyConfig() {
  return useQuery({
    queryKey: ["currency-config"],
    queryFn: async (): Promise<CurrencyConfig> => {
      const { data } = await supabase
        .from("admin_records")
        .select("data")
        .eq("kind", "currency_config")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULT_CURRENCY_CONFIG;
      return { ...DEFAULT_CURRENCY_CONFIG, ...((data.data as Partial<CurrencyConfig>) || {}) };
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: config } = useCurrencyConfig();
  const cfg = config ?? DEFAULT_CURRENCY_CONFIG;

  const [code, setCodeState] = useState<CurrencyCode>("USD");

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "USD" || stored === "BDT") setCodeState(stored);
    } catch { /* ignore */ }
  }, []);

  // If USD gets disabled by admin, force BDT
  useEffect(() => {
    if (!cfg.enable_usd && code === "USD") setCodeState("BDT");
  }, [cfg.enable_usd, code]);


  const setCode = useCallback((c: CurrencyCode) => {
    setCodeState(c);
    try { localStorage.setItem(LS_KEY, c); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => {
    const rate = cfg.usd_rate > 0 ? cfg.usd_rate : DEFAULT_CURRENCY_CONFIG.usd_rate;
    const symbol = code === "USD" ? cfg.usd_symbol : cfg.bdt_symbol;

    const format = (bdt: number, opts?: { decimals?: number }) => {
      const n = Number.isFinite(bdt) ? bdt : 0;
      if (code === "USD") {
        const usd = n / rate;
        const d = opts?.decimals ?? 2;
        return `${cfg.usd_symbol}${usd.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
      }
      const d = opts?.decimals ?? 0;
      return `${cfg.bdt_symbol}${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
    };

    const formatString = (input: string | number | undefined | null) => {
      if (input === null || input === undefined) return "—";
      if (typeof input === "number") return format(input);
      const s = String(input);
      const hasPlus = /\+\s*$/.test(s);
      const n = extractNumber(s);
      return format(n) + (hasPlus ? "+" : "");
    };

    return { code, setCode, config: cfg, symbol, format, formatString };
  }, [code, setCode, cfg]);

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) {
    // Safe fallback if provider missing (e.g. isolated render)
    return {
      code: "BDT" as CurrencyCode,
      setCode: () => {},
      config: DEFAULT_CURRENCY_CONFIG,
      symbol: "৳",
      format: (n: number) => `৳${(Number.isFinite(n) ? n : 0).toLocaleString("en-US")}`,
      formatString: (v: string | number | undefined | null) => {
        if (v === null || v === undefined) return "—";
        if (typeof v === "number") return `৳${v.toLocaleString("en-US")}`;
        return String(v);
      },
    } satisfies Ctx;
  }
  return ctx;
}
