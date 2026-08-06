import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Any ISO-ish code — currencies are fully admin-managed now. */
export type CurrencyCode = string;

export type CurrencyDef = {
  /** e.g. "BDT", "USD", "EUR" */
  code: string;
  /** e.g. "৳", "$", "€" */
  symbol: string;
  /** Human label shown in the picker, e.g. "US Dollar" */
  label: string;
  /** How many BASE units (BDT) equal 1 unit of this currency. Base itself = 1. */
  rate: number;
  /** Decimal places used when displaying. */
  decimals: number;
  /** Show in the switcher / allow selection. */
  enabled: boolean;
  /** Exactly one currency is the base — all prices are stored in it. */
  base?: boolean;
};

export type CurrencyConfig = {
  /** Master switch for the header switcher. */
  switcher_enabled: boolean;
  currencies: CurrencyDef[];
};

export const BASE_CODE = "BDT";

export const DEFAULT_CURRENCIES: CurrencyDef[] = [
  { code: "BDT", symbol: "৳", label: "বাংলাদেশি টাকা", rate: 1, decimals: 0, enabled: true, base: true },
  { code: "USD", symbol: "$", label: "US Dollar", rate: 135, decimals: 2, enabled: true },
];

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  switcher_enabled: true,
  currencies: DEFAULT_CURRENCIES,
};

const LS_KEY = "rama.currency";

type Ctx = {
  code: CurrencyCode;
  setCode: (c: CurrencyCode) => void;
  config: CurrencyConfig;
  /** Enabled currencies (base always included). */
  options: CurrencyDef[];
  active: CurrencyDef;
  symbol: string;
  /** Format a BASE (BDT) numeric value into the active currency for display. */
  format: (base: number, opts?: { decimals?: number }) => string;
  /** Reformat a raw price string like "৳499+" preserving a trailing "+". */
  formatString: (input: string | number | undefined | null) => string;
};

const CurrencyCtx = createContext<Ctx | null>(null);

function extractNumber(s: string): number {
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

/** Normalise whatever is stored in admin_records (incl. the old usd_* shape). */
export function normalizeCurrencyConfig(raw: unknown): CurrencyConfig {
  const d = (raw ?? {}) as Record<string, unknown>;

  let list: CurrencyDef[] = [];
  if (Array.isArray(d.currencies)) {
    list = (d.currencies as Array<Record<string, unknown>>)
      .map((c) => ({
        code: String(c.code ?? "").trim().toUpperCase().slice(0, 6),
        symbol: String(c.symbol ?? "").trim().slice(0, 4) || "¤",
        label: String(c.label ?? c.code ?? "").trim().slice(0, 60),
        rate: Number(c.rate) > 0 ? Number(c.rate) : 1,
        decimals: Number.isFinite(Number(c.decimals)) ? Math.min(4, Math.max(0, Number(c.decimals))) : 2,
        enabled: c.enabled !== false,
        base: c.base === true,
      }))
      .filter((c) => c.code.length >= 2);
  }

  // Legacy shape → build BDT + USD
  if (list.length === 0) {
    const usdRate = Number(d.usd_rate) > 0 ? Number(d.usd_rate) : 135;
    list = [
      { code: "BDT", symbol: String(d.bdt_symbol ?? "৳") || "৳", label: "বাংলাদেশি টাকা", rate: 1, decimals: 0, enabled: true, base: true },
      { code: "USD", symbol: String(d.usd_symbol ?? "$") || "$", label: "US Dollar", rate: usdRate, decimals: 2, enabled: d.enable_usd !== false },
    ];
  }

  // Guarantee exactly one base (BDT) and that it is enabled.
  const baseIdx = list.findIndex((c) => c.base) >= 0 ? list.findIndex((c) => c.base) : list.findIndex((c) => c.code === BASE_CODE);
  if (baseIdx < 0) {
    list.unshift({ code: BASE_CODE, symbol: "৳", label: "বাংলাদেশি টাকা", rate: 1, decimals: 0, enabled: true, base: true });
  }
  list = list.map((c, i) => {
    const isBase = i === (baseIdx < 0 ? 0 : baseIdx);
    return isBase ? { ...c, base: true, rate: 1, enabled: true } : { ...c, base: false };
  });

  // De-duplicate by code (first wins)
  const seen = new Set<string>();
  list = list.filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)));

  return {
    switcher_enabled: d.switcher_enabled === undefined ? d.enable_usd !== false : d.switcher_enabled !== false,
    currencies: list,
  };
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
      return normalizeCurrencyConfig(data.data);
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

function fmt(def: CurrencyDef, baseAmount: number, decimals?: number) {
  const n = Number.isFinite(baseAmount) ? baseAmount : 0;
  const rate = def.rate > 0 ? def.rate : 1;
  const value = n / rate;
  const d = decimals ?? def.decimals;
  return `${def.symbol}${value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: config } = useCurrencyConfig();
  const cfg = config ?? DEFAULT_CURRENCY_CONFIG;

  const options = useMemo(
    () => cfg.currencies.filter((c) => c.enabled || c.base),
    [cfg.currencies],
  );
  const baseDef = useMemo(
    () => cfg.currencies.find((c) => c.base) ?? cfg.currencies[0] ?? DEFAULT_CURRENCIES[0]!,
    [cfg.currencies],
  );

  const [code, setCodeState] = useState<CurrencyCode>(BASE_CODE);

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setCodeState(stored);
    } catch { /* ignore */ }
  }, []);

  // If the selected currency was disabled/removed by admin, fall back to base.
  useEffect(() => {
    if (!options.some((o) => o.code === code)) setCodeState(baseDef.code);
  }, [options, code, baseDef.code]);

  const setCode = useCallback((c: CurrencyCode) => {
    setCodeState(c);
    try { localStorage.setItem(LS_KEY, c); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => {
    const active = options.find((o) => o.code === code) ?? baseDef;
    return {
      code: active.code,
      setCode,
      config: cfg,
      options,
      active,
      symbol: active.symbol,
      format: (base: number, opts?: { decimals?: number }) => fmt(active, base, opts?.decimals),
      formatString: (input: string | number | undefined | null) => {
        if (input === null || input === undefined) return "—";
        if (typeof input === "number") return fmt(active, input);
        const s = String(input);
        const hasPlus = /\+\s*$/.test(s);
        return fmt(active, extractNumber(s)) + (hasPlus ? "+" : "");
      },
    };
  }, [code, setCode, cfg, options, baseDef]);

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) {
    // Safe fallback if provider missing (e.g. isolated render)
    const base = DEFAULT_CURRENCIES[0]!;
    return {
      code: base.code,
      setCode: () => {},
      config: DEFAULT_CURRENCY_CONFIG,
      options: [base],
      active: base,
      symbol: base.symbol,
      format: (n: number) => fmt(base, n),
      formatString: (v: string | number | undefined | null) => {
        if (v === null || v === undefined) return "—";
        if (typeof v === "number") return fmt(base, v);
        return String(v);
      },
    };
  }
  return ctx;
}
