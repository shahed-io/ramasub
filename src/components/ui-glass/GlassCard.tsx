import { forwardRef, HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Shared Glassmorphism primitive.
 *
 * Configurable via `tint` (color family), `blur` (backdrop blur strength),
 * `glow` (ambient shadow size) plus `padding`, `rounded`, and `border`.
 *
 * The legacy `tone` prop ("strong" | "soft") is still supported as a shortcut
 * for back-compat with existing call sites.
 */
const glassVariants = cva(
  "relative border transition-all",
  {
    variants: {
      tint: {
        // Higher opacity on mobile for readability; softer on md+ for the glass look.
        neutral: "bg-white/70 md:bg-white/40 border-white/70 md:border-white/60",
        teal: "bg-gradient-to-br from-white/75 via-white/65 to-teal-50/70 md:from-white/50 md:via-white/40 md:to-teal-50/50 border-white/70 md:border-white/60",
        emerald: "bg-gradient-to-br from-white/75 via-white/65 to-emerald-50/70 md:from-white/50 md:via-white/40 md:to-emerald-50/50 border-white/70 md:border-white/60",
        violet: "bg-gradient-to-br from-white/75 via-white/65 to-violet-50/70 md:from-white/50 md:via-white/40 md:to-violet-50/50 border-white/70 md:border-white/60",
        aurora: "bg-gradient-to-br from-teal-100/60 via-white/65 to-violet-100/60 md:from-teal-100/40 md:via-white/40 md:to-violet-100/40 border-white/70 md:border-white/60",
        slate: "bg-slate-900/55 md:bg-slate-900/40 border-white/20 md:border-white/15 text-slate-100",
      },
      blur: {
        // Lighter blur on mobile (perf + clarity), heavier on md+.
        none: "backdrop-blur-0",
        sm: "backdrop-blur-[2px] md:backdrop-blur-sm",
        md: "backdrop-blur-sm md:backdrop-blur-md",
        lg: "backdrop-blur-md md:backdrop-blur-xl",
        xl: "backdrop-blur-lg md:backdrop-blur-2xl",
      },
      glow: {
        none: "",
        sm: "shadow-[0_2px_12px_-6px_rgba(20,184,166,0.2)] md:shadow-[0_4px_18px_-8px_rgba(20,184,166,0.25)]",
        md: "shadow-[0_6px_20px_-10px_rgba(20,184,166,0.28)] md:shadow-[0_10px_30px_-12px_rgba(20,184,166,0.35)]",
        lg: "shadow-[0_10px_30px_-12px_rgba(20,184,166,0.35)] md:shadow-[0_18px_50px_-14px_rgba(20,184,166,0.45)]",
      },
      padding: {
        none: "p-0",
        sm: "p-2.5 md:p-3",
        md: "p-3 md:p-4",
        lg: "p-4 md:p-6",
        xl: "p-5 md:p-8",
      },
      rounded: {
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-lg md:rounded-xl",
        "2xl": "rounded-xl md:rounded-2xl",
        "3xl": "rounded-2xl md:rounded-3xl",
        full: "rounded-full",
      },
      hover: {
        none: "",
        lift: "hover:bg-white/55 hover:border-teal-300/60 hover:-translate-y-0.5",
      },
    },
    defaultVariants: {
      tint: "neutral",
      blur: "lg",
      glow: "md",
      padding: "lg",
      rounded: "2xl",
      hover: "none",
    },
  },
);

export type GlassTint = NonNullable<VariantProps<typeof glassVariants>["tint"]>;
export type GlassBlur = NonNullable<VariantProps<typeof glassVariants>["blur"]>;
export type GlassGlow = NonNullable<VariantProps<typeof glassVariants>["glow"]>;

export interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassVariants> {
  /** Legacy shortcut. "strong" => blur xl + glow md, "soft" => blur md + glow sm. */
  tone?: "strong" | "soft";
  /** Render decorative blurred color orbs inside the card. */
  orbs?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ tone, tint, blur, glow, padding, rounded, hover, orbs, className, children, ...rest }, ref) => {
    // Legacy tone => modern variant mapping (only when caller did not set blur/glow explicitly)
    const resolvedBlur = blur ?? (tone === "soft" ? "md" : tone === "strong" ? "xl" : undefined);
    const resolvedGlow = glow ?? (tone === "soft" ? "sm" : tone === "strong" ? "md" : undefined);

    return (
      <div
        ref={ref}
        className={cn(
          glassVariants({ tint, blur: resolvedBlur, glow: resolvedGlow, padding, rounded, hover }),
          orbs && "overflow-hidden",
          className,
        )}
        {...rest}
      >
        {orbs && (
          <>
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-teal-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl" />
          </>
        )}
        {orbs ? <div className="relative">{children}</div> : children}
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";

export { glassVariants };
