import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeSwitcher() {
  const { theme, enabledThemes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Hide entirely when there is no real choice (≤1 theme enabled).
  if (enabledThemes.length <= 1) return null;

  const active = enabledThemes.find((t) => t.id === theme) ?? enabledThemes[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        title={`Theme: ${active.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid place-items-center w-10 h-10 rounded-full glass-strong text-primary hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 md:left-auto md:right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-popover text-popover-foreground backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Theme</div>
          </div>
          <div className="space-y-1">
            {enabledThemes.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition",
                    isActive
                      ? "bg-accent border border-border"
                      : "hover:bg-accent/60 border border-transparent",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="shrink-0 w-9 h-9 rounded-lg ring-1 ring-border shadow-inner"
                    style={{ backgroundImage: t.swatch }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground truncate">{t.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{t.description}</span>
                  </span>
                  {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="px-3 pt-2 pb-1 mt-1 border-t border-border">
            <p className="text-[10.5px] text-muted-foreground leading-relaxed">
              আরও theme শীঘ্রই যোগ হবে।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
