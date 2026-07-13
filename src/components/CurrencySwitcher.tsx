import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check } from "lucide-react";
import { useCurrency, type CurrencyCode } from "@/context/CurrencyContext";

/**
 * Compact currency toggle.
 * - Desktop (sm+): segmented pill with both options visible.
 * - Mobile: single button showing the active currency; tap opens a dropdown with both options.
 */
export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { code, setCode, config } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!config.enable_usd) return null;

  const options: Array<{ v: CurrencyCode; label: string; symbol: string; short: string }> = [
    { v: "BDT", label: "বাংলাদেশি টাকা", symbol: "৳", short: "BDT" },
    { v: "USD", label: "US Dollar", symbol: "$", short: "USD" },
  ];

  const active = options.find((o) => o.v === code) ?? options[0];

  return (
    <>
      {/* MOBILE — single button + dropdown */}
      <div ref={wrapRef} className="relative sm:hidden shrink-0">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Currency selector. Current currency ${active.short}. Tap to change between BDT and USD.`}
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-9 min-w-[64px] items-center justify-center gap-1 rounded-full border border-white/20 bg-white/95 px-1.5 text-[12px] font-black leading-none text-primary-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_-10px_rgba(15,23,42,0.55)] ring-1 ring-primary/20 transition-transform active:scale-95"
          style={{
            backdropFilter: "blur(12px)",
          }}
        >
          {options.map((o) => {
            const isActive = o.v === active.v;
            return (
              <span
                key={o.v}
                aria-hidden
                className={[
                  "grid h-6 w-6 place-items-center rounded-full transition-all",
                  isActive
                    ? "bg-gradient-to-b from-primary via-violet-500 to-primary-dark text-primary-foreground shadow-[0_5px_12px_-6px_rgba(124,58,237,0.8)]"
                    : "bg-secondary text-muted-foreground",
                ].join(" ")}
              >
                {o.symbol}
              </span>
            );
          })}
          <span aria-hidden className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_3px_8px_-4px_rgba(15,23,42,0.55)] ring-2 ring-background">
            <ArrowLeftRight className="h-2.5 w-2.5" strokeWidth={3.2} />
          </span>
        </button>


        {open && (
          <div
            role="listbox"
            aria-label="Select currency"
            className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[188px] max-w-[calc(100vw-24px)] rounded-xl bg-popover p-1.5 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35),0_0_0_1px_rgba(139,92,246,0.25)] animate-in fade-in slide-in-from-top-1 duration-150"
          >

            {options.map((o) => {
              const isActive = o.v === code;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setCode(o.v);
                    setOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-secondary text-primary-dark"
                      : "text-muted-foreground hover:bg-secondary/70",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black shrink-0",
                      isActive
                        ? "bg-gradient-to-b from-primary via-violet-500 to-primary-dark text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                        : "bg-secondary text-muted-foreground",
                    ].join(" ")}
                    aria-hidden
                  >
                    {o.symbol}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold leading-tight">{o.short}</span>
                    <span className="block text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                      {o.label}
                    </span>
                  </span>
                  {isActive && (
                    <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP — segmented pill */}
      <div
        role="group"
        aria-label="Currency selector"
        className="hidden sm:inline-flex items-center rounded-full p-[3px] shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(255,255,255,0.06) 40%, rgba(124,58,237,0.25))",
          boxShadow:
            "inset 0 0 0 1px rgba(139,92,246,0.35), 0 6px 18px -8px rgba(0,0,0,0.55)",
        }}
      >
        <div className="inline-flex items-center rounded-full bg-white/95 backdrop-blur-md p-0.5">
          {options.map((o) => {
            const isActive = code === o.v;
            return (
              <button
                key={o.v}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCode(o.v)}
                className={[
                  "inline-flex items-center justify-center rounded-full font-semibold tracking-wide transition-all whitespace-nowrap",
                  compact ? "h-7 px-3 text-[10.5px]" : "h-8 px-3.5 text-[11px]",
                  isActive
                    ? "text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-4px_rgba(124,58,237,0.55)]"
                    : "text-[#5b21b6] hover:text-[#7c3aed]",
                ].join(" ")}
                style={
                  isActive
                    ? { background: "linear-gradient(180deg,#a78bfa 0%,#7c3aed 55%,#5b21b6 100%)" }
                    : undefined
                }
              >
                {o.symbol} {o.short}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
