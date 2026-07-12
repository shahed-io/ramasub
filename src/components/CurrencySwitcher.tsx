import { useCurrency, type CurrencyCode } from "@/context/CurrencyContext";

/**
 * Compact currency toggle button — shows BDT / USD, tap to switch.
 * Auto-hides USD when admin has disabled it.
 */
export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { code, setCode, config } = useCurrency();

  if (!config.enable_usd) return null; // nothing to switch to

  const options: Array<{ v: CurrencyCode; label: string }> = [
    { v: "BDT", label: "৳ BDT" },
    { v: "USD", label: "$ USD" },
  ];

  return (
    <div
      role="group"
      aria-label="Currency selector"
      className="inline-flex items-center rounded-full border border-white/15 bg-white/8 backdrop-blur-md p-0.5 shrink-0"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}
    >
      {options.map((o) => {
        const active = code === o.v;
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={active}
            onClick={() => setCode(o.v)}
            className={[
              "inline-flex items-center justify-center rounded-full font-bold transition-all whitespace-nowrap",
              compact ? "h-7 px-2 text-[10.5px]" : "h-8 px-2.5 text-[11px]",
              active
                ? "bg-gradient-to-r from-amber-400 to-sky-400 text-slate-900 shadow-[0_4px_14px_-4px_rgba(251,191,36,0.6)]"
                : "text-white/75 hover:text-white",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
