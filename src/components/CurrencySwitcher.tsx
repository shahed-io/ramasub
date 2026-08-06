import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, ChevronDown } from "lucide-react";
import { useCurrency, type CurrencyDef } from "@/context/CurrencyContext";

/**
 * Compact, fully admin-driven currency switcher.
 * - Currencies (code / symbol / label / rate) come from admin_records → currency_config.
 * - Desktop: segmented pill when ≤3 currencies, dropdown when more.
 * - Mobile: single button showing the enabled symbols; tap opens a list.
 */
export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { code, setCode, config, options } = useCurrency();
  const [open, setOpen] = useState(false);
  const [openDesktop, setOpenDesktop] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const deskRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open && !openDesktop) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(t)) setOpen(false);
      if (deskRef.current && !deskRef.current.contains(t)) setOpenDesktop(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setOpenDesktop(false); }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, openDesktop]);

  // Hidden when the admin turns the switcher off, or when there is nothing to switch between.
  if (!config.switcher_enabled || options.length < 2) return null;

  const active = options.find((o) => o.code === code) ?? options[0]!;
  const compactSymbols = options.slice(0, 3);
  const useDesktopDropdown = options.length > 3;

  const OptionRow = ({ o }: { o: CurrencyDef }) => {
    const isActive = o.code === active.code;
    return (
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => { setCode(o.code); setOpen(false); setOpenDesktop(false); }}
        className={[
          "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
          isActive ? "bg-secondary text-primary-dark" : "text-muted-foreground hover:bg-secondary/70",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black shrink-0",
            isActive
              ? "bg-gradient-to-b from-primary via-primary to-primary-dark text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
              : "bg-secondary text-muted-foreground",
          ].join(" ")}
          aria-hidden
        >
          {o.symbol}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold leading-tight">{o.code}</span>
          <span className="block text-[10.5px] text-muted-foreground leading-tight mt-0.5 truncate">
            {o.label}
          </span>
        </span>
        {isActive && <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={3} />}
      </button>
    );
  };

  return (
    <>
      {/* MOBILE — single button + dropdown */}
      <div ref={wrapRef} className="relative sm:hidden shrink-0">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Currency selector. Current currency ${active.code}. Tap to change currency.`}
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-9 min-w-[64px] items-center justify-center gap-1 rounded-full border border-border bg-popover px-1.5 text-[12px] font-black leading-none text-primary-dark shadow-[0_8px_20px_-10px_rgba(15,23,42,0.55)] ring-1 ring-primary/20 transition-transform active:scale-95"
          style={{ backdropFilter: "blur(12px)" }}
        >
          {compactSymbols.map((o) => {
            const isActive = o.code === active.code;
            return (
              <span
                key={o.code}
                aria-hidden
                className={[
                  "grid h-6 w-6 place-items-center rounded-full transition-all",
                  isActive
                    ? "bg-gradient-to-b from-primary via-primary to-primary-dark text-primary-foreground shadow-[0_5px_12px_-6px_rgba(124,58,237,0.8)]"
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
            className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[60vh] min-w-[188px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl bg-popover p-1.5 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35),0_0_0_1px_rgba(139,92,246,0.25)] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {options.map((o) => <OptionRow key={o.code} o={o} />)}
          </div>
        )}
      </div>

      {/* DESKTOP */}
      {useDesktopDropdown ? (
        <div ref={deskRef} className="relative hidden sm:block shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={openDesktop}
            onClick={() => setOpenDesktop((v) => !v)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full bg-white/95 font-semibold text-[#5b21b6] transition-all hover:text-[#7c3aed]",
              compact ? "h-8 px-3 text-[11px]" : "h-9 px-3.5 text-[12px]",
            ].join(" ")}
            style={{ boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.35), 0 6px 18px -8px rgba(0,0,0,0.35)" }}
          >
            <span className="font-black">{active.symbol}</span> {active.code}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openDesktop && (
            <div
              role="listbox"
              aria-label="Select currency"
              className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[60vh] min-w-[210px] overflow-y-auto rounded-xl bg-popover p-1.5 text-popover-foreground shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35),0_0_0_1px_rgba(139,92,246,0.25)] animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {options.map((o) => <OptionRow key={o.code} o={o} />)}
            </div>
          )}
        </div>
      ) : (
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
              const isActive = o.code === active.code;
              return (
                <button
                  key={o.code}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCode(o.code)}
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
                  {o.symbol} {o.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
