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
      className="inline-flex items-center rounded-full p-[3px] shrink-0"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.35), rgba(255,255,255,0.06) 40%, rgba(212,175,55,0.25))",
        boxShadow: "inset 0 0 0 1px rgba(212,175,55,0.35), 0 6px 18px -8px rgba(0,0,0,0.55)",
      }}
    >
      <div className="inline-flex items-center rounded-full bg-white/95 backdrop-blur-md p-0.5">
        {options.map((o) => {
          const active = code === o.v;
          return (
            <button
              key={o.v}
              type="button"
              aria-pressed={active}
              onClick={() => setCode(o.v)}
              className={[
                "inline-flex items-center justify-center rounded-full font-semibold tracking-wide transition-all whitespace-nowrap",
                compact ? "h-7 px-3 text-[10.5px]" : "h-8 px-3.5 text-[11px]",
                active
                  ? "text-[#1a1206] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_12px_-4px_rgba(212,175,55,0.55)]"
                  : "text-white/60 hover:text-amber-100",
              ].join(" ")}
              style={
                active
                  ? { background: "linear-gradient(180deg,#f5e6a8 0%,#d4af37 55%,#a8801f 100%)" }
                  : undefined
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

