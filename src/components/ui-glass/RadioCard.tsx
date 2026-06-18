import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadioCardProps {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function RadioCard({ checked, onClick, children, className, ariaLabel }: RadioCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "border-primary glass glow-violet"
          : "border-transparent glass-soft hover:border-primary/40",
        className,
      )}
    >
      {children}
      {checked && (
        <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-aurora text-primary-foreground">
          <Check className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
