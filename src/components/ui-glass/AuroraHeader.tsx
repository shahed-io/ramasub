import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AuroraHeaderProps {
  children?: ReactNode;
}

export function AuroraHeader({ children }: AuroraHeaderProps) {
  return (
    <header className="bg-aurora text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="relative mx-auto max-w-[1440px] px-4 md:px-10 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="grid place-items-center w-9 h-9 rounded-full glass-strong text-primary font-bold">
            A
          </span>
          AccessNow BD
        </Link>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
