import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

/**
 * Unified search input — rounded pill with left magnifier and a divider + colored
 * search icon button on the right (matches the global command palette style).
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "প্রোডাক্ট সার্চ করুন...",
  size = "md",
  autoFocus = false,
  className,
  inputClassName,
  ariaLabel = "Search",
  showSubmit = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
  size?: Size;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  showSubmit?: boolean;
}) {
  const heights: Record<Size, string> = { sm: "h-10", md: "h-12", lg: "h-14" };
  const iconSizes: Record<Size, string> = { sm: "w-4 h-4", md: "w-[18px] h-[18px]", lg: "w-5 h-5" };
  const padLeft: Record<Size, string> = { sm: "pl-10", md: "pl-12", lg: "pl-14" };
  const iconLeft: Record<Size, string> = { sm: "left-3.5", md: "left-4", lg: "left-5" };
  const textSizes: Record<Size, string> = { sm: "text-sm", md: "text-[15px]", lg: "text-base" };
  const btnSizes: Record<Size, string> = { sm: "w-9", md: "w-11", lg: "w-12" };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      role="search"
      className={cn("relative w-full", className)}
    >
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none",
          iconLeft[size],
          iconSizes[size],
        )}
        strokeWidth={2}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "w-full rounded-full border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 shadow-sm",
          "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-sm",
          "transition-colors",
          heights[size],
          padLeft[size],
          showSubmit ? "pr-14" : "pr-5",
          textSizes[size],
          inputClassName,
        )}
      />
      {showSubmit && (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-px bg-slate-200",
              size === "sm" ? "right-9 h-5" : size === "md" ? "right-11 h-6" : "right-12 h-7",
            )}
          />
          <button
            type="submit"
            aria-label="Submit search"
            className={cn(
              "absolute top-0 right-0 h-full inline-flex items-center justify-center text-indigo-500 hover:text-indigo-600 transition",
              btnSizes[size],
            )}
          >
            <Search className={iconSizes[size]} strokeWidth={2.25} />
          </button>
        </>
      )}
    </form>
  );
}

/**
 * Trigger button — same pill shape, opens the command palette.
 */
export function SearchTrigger({
  onClick,
  placeholder = "প্রোডাক্ট সার্চ করুন...",
  className,
  size = "md",
  showShortcut = true,
}: {
  onClick: () => void;
  placeholder?: string;
  className?: string;
  size?: Size;
  showShortcut?: boolean;
}) {
  const heights: Record<Size, string> = { sm: "h-10", md: "h-12", lg: "h-14" };
  const padLeft: Record<Size, string> = { sm: "pl-10", md: "pl-12", lg: "pl-14" };
  const iconLeft: Record<Size, string> = { sm: "left-3.5", md: "left-4", lg: "left-5" };
  const textSizes: Record<Size, string> = { sm: "text-sm", md: "text-[15px]", lg: "text-base" };
  const iconSizes: Record<Size, string> = { sm: "w-4 h-4", md: "w-[18px] h-[18px]", lg: "w-5 h-5" };
  const btnSizes: Record<Size, string> = { sm: "w-9", md: "w-11", lg: "w-12" };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      className={cn(
        "relative w-full rounded-full border border-slate-200 bg-white text-left shadow-sm",
        "hover:border-indigo-300/70 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        "transition-colors",
        heights[size],
        className,
      )}
    >
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-slate-400",
          iconLeft[size],
          iconSizes[size],
        )}
        strokeWidth={2}
      />
      <span
        className={cn(
          "block truncate text-slate-400 pr-16",
          padLeft[size],
          textSizes[size],
        )}
      >
        {placeholder}
      </span>
      {showShortcut && (
        <kbd className="hidden lg:inline-flex absolute top-1/2 -translate-y-1/2 right-14 items-center gap-0.5 h-6 px-1.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="opacity-70">⌘</span>K
        </kbd>
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-px bg-slate-200",
          size === "sm" ? "right-9 h-5" : size === "md" ? "right-11 h-6" : "right-12 h-7",
        )}
      />
      <span
        className={cn(
          "absolute top-0 right-0 h-full inline-flex items-center justify-center text-indigo-500",
          btnSizes[size],
        )}
      >
        <Search className={iconSizes[size]} strokeWidth={2.25} />
      </span>
    </button>
  );
}
