import { Link } from "@tanstack/react-router";
import ramaSubLogoAsset from "@/assets/rama-logo-new.png.asset.json";

const ramaSubLogo = ramaSubLogoAsset.url;

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; word: string; tag: string }> = {
  sm: { box: "w-9 h-9", word: "text-[18px]", tag: "text-[8.5px]" },
  md: { box: "w-11 h-11 md:w-[52px] md:h-[52px]", word: "text-[22px] md:text-[26px]", tag: "text-[10px] md:text-[10.5px]" },
  lg: { box: "w-[60px] h-[60px] md:w-[68px] md:h-[68px]", word: "text-[26px] md:text-[32px]", tag: "text-[10px] md:text-[11px]" },
};

interface BrandLogoProps {
  size?: Size;
  showWordmark?: boolean;
  to?: string;
  className?: string;
  underlineId?: string;
}

/**
 * Canonical Rama Sub brand mark — round white logo with spinning gradient ring,
 * gradient "Rama Sub" wordmark and curved-underlined RAMASUB.COM.BD tag.
 * Mirrors the SiteHeader design so the same identity is reused everywhere.
 */
export function BrandLogo({
  size = "md",
  showWordmark = true,
  to,
  className = "",
  underlineId = "brandLogoUnderline",
}: BrandLogoProps) {
  const s = SIZES[size];

  const mark = (
    <span
      aria-hidden
      className="relative grid place-items-center shrink-0 rounded-full p-[2.5px] transition-transform duration-500 group-hover:scale-[1.04]"
      style={{
        background: "white",
        boxShadow:
          "0 0 0 2px white, 0 4px 20px rgba(0,0,0,0.12), 0 0 40px -5px rgba(139,92,246,0.45), 0 0 12px 2px rgba(167,139,250,0.35)",
      }}
    >
      <span
        className="absolute inset-[-4px] rounded-full pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #fb923c, #38bdf8, #f59e0b)",
          padding: "2px",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "spin 4s linear infinite",
        }}
      />
      <span className={`grid place-items-center ${s.box} rounded-full overflow-hidden bg-white relative`}>
        <img
          src={ramaSubLogo}
          alt="Rama Sub logo"
          draggable={false}
          className="w-full h-full object-contain p-[3px]"
          width={128}
          height={128}
        />
      </span>
    </span>
  );

  const wordmark = showWordmark ? (
    <span className="flex flex-col leading-none min-w-0">
      <span
        className={`${s.word} font-extrabold tracking-tight whitespace-nowrap bg-clip-text text-transparent`}
        style={{
          fontFamily: "'Poppins', var(--font-heading)",
          backgroundImage: "linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #38bdf8 100%)",
          filter: "drop-shadow(0 0 14px rgba(251,146,60,0.35))",
        }}
      >
        Rama Sub
      </span>
      <span className="mt-1.5 relative inline-flex flex-col items-start">
        <span className={`${s.tag} font-bold tracking-[0.22em] uppercase text-current/80 whitespace-nowrap`}>
          RAMASUB.COM.BD
        </span>
        <svg
          aria-hidden
          viewBox="0 0 140 8"
          preserveAspectRatio="none"
          className="absolute left-0 -bottom-1.5 w-full h-[6px]"
        >
          <path
            d={"M2 5 Q 35 1, 70 4 T 138 3"}
            fill="none"
            stroke={`url(#${underlineId})`}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={underlineId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="55%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    </span>
  ) : null;

  const inner = (
    <>
      {mark}
      {wordmark}
    </>
  );

  const baseCls = `flex items-center gap-3 sm:gap-3.5 shrink-0 group min-w-0 ${className}`;
  const style = { fontFamily: "var(--font-heading)" as const };

  if (to) {
    return (
      <Link to={to} className={baseCls} style={style} aria-label="Rama Sub home">
        {inner}
      </Link>
    );
  }
  return (
    <span className={baseCls} style={style}>
      {inner}
    </span>
  );
}
