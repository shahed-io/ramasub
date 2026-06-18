import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Reusable Glassmorphism button.
 *
 * Variants:
 * - primary    teal→emerald gradient (main CTAs like "Buy it now")
 * - secondary  light frosted glass with teal accent border (e.g. "Add to cart")
 * - outline    transparent glass border (e.g. duration chips, accordion toggles)
 * - solid      filled teal accent (e.g. active chip state)
 * - ghost      no background, hover tint
 * - destructive red gradient
 */
const glassButtonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 font-semibold transition-all",
    "backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-1",
    "disabled:opacity-60 disabled:pointer-events-none",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-teal-500/80 to-emerald-500/80 border border-white/40 text-white hover:from-teal-500 hover:to-emerald-500 shadow-[0_8px_28px_-6px_rgba(20,184,166,0.55)]",
        secondary:
          "bg-white/50 md:bg-white/40 border border-teal-400/50 text-teal-900 hover:bg-white/70 hover:border-teal-400/80 shadow-[0_4px_20px_-6px_rgba(20,184,166,0.4)]",
        outline:
          "bg-white/55 md:bg-white/40 border border-white/70 md:border-white/60 text-slate-800 hover:bg-white/75 hover:border-teal-300/60 shadow-[0_3px_14px_-6px_rgba(20,184,166,0.25)]",
        solid:
          "bg-teal-500/30 border border-teal-400/60 text-teal-900 shadow-[0_4px_20px_-4px_rgba(20,184,166,0.5)]",
        ghost:
          "bg-transparent border border-transparent text-slate-700 hover:bg-teal-500/15",
        destructive:
          "bg-gradient-to-r from-rose-500/85 to-red-500/85 border border-white/40 text-white hover:from-rose-500 hover:to-red-500 shadow-[0_8px_24px_-6px_rgba(244,63,94,0.5)]",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 p-0",
      },
      rounded: {
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        full: "rounded-full",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      rounded: "xl",
      fullWidth: false,
    },
  },
);

export interface GlassButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant, size, rounded, fullWidth, className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(glassButtonVariants({ variant, size, rounded, fullWidth }), className)}
      {...rest}
    />
  ),
);
GlassButton.displayName = "GlassButton";

export { glassButtonVariants };
