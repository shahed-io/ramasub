import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  bn?: string;
}

interface StepperProps {
  steps: StepperStep[];
  current: number; // 1-indexed
  onStepClick?: (n: number) => void;
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <ol
      className="flex items-center gap-2 sm:gap-4 w-full"
      aria-label={`Checkout: step ${current} of ${steps.length}`}
    >
      {steps.map((step, idx) => {
        const n = idx + 1;
        const status =
          n < current ? "complete" : n === current ? "current" : "upcoming";
        const clickable = !!onStepClick && n < current;

        return (
          <li
            key={step.label}
            className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0"
          >
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(n)}
              aria-current={status === "current" ? "step" : undefined}
              aria-disabled={!clickable}
              aria-label={`Step ${n} of ${steps.length}: ${step.label}${
                status === "complete"
                  ? " (completed, tap to edit)"
                  : status === "current"
                    ? " (current)"
                    : " (locked)"
              }`}
              className={cn(
                // Larger 44px hit area for mobile, full width so the row is easy to tap
                "flex items-center gap-2 sm:gap-3 group rounded-xl min-h-11 px-1 sm:px-2 -mx-1 w-full text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                clickable && "cursor-pointer hover:bg-[var(--glass-soft)] active:bg-[var(--glass-soft)]",
                !clickable && "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid place-items-center w-9 h-9 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition-all shrink-0",
                  status === "complete" &&
                    "bg-aurora text-primary-foreground glow-violet",
                  status === "current" &&
                    "bg-aurora text-primary-foreground glow-aqua ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
                  status === "upcoming" &&
                    "glass-soft text-muted-foreground",
                )}
              >
                {status === "complete" ? <Check className="w-4 h-4" /> : n}
              </span>
              <span className="flex flex-col min-w-0">
                {/* Mobile-only tiny label so each step is identifiable without taking horizontal room */}
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-medium leading-none sm:hidden",
                    status === "current" ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Step {n}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold truncate mt-0.5 sm:mt-0",
                    // Hide label only on the very smallest screens for non-current steps to save space
                    status !== "current" && "hidden sm:inline",
                    status === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
              </span>
            </button>
            {n < steps.length && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors shrink",
                  n < current ? "bg-aurora" : "bg-[var(--glass-border-soft)]",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
