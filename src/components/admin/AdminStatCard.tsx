import { TrendingDown, TrendingUp } from "lucide-react";

export type AdminStatTone = "indigo" | "rose" | "emerald" | "violet" | "sky";

// New color palette: brand purple #6D4AFF
const TONES: Record<AdminStatTone, { stroke: string; fill: string; gloss: string }> = {
  indigo:  { stroke: "#6D4AFF", fill: "rgba(109,74,255,0.08)",  gloss: "rgba(109,74,255,0.12)" },
  rose:    { stroke: "#DC2626", fill: "rgba(220,38,38,0.07)",   gloss: "rgba(220,38,38,0.10)" },
  emerald: { stroke: "#15803D", fill: "rgba(21,128,61,0.08)",   gloss: "rgba(21,128,61,0.12)" },
  sky:     { stroke: "#0ea5e9", fill: "rgba(14,165,233,0.08)",  gloss: "rgba(14,165,233,0.12)" },
  violet:  { stroke: "#6D4AFF", fill: "rgba(109,74,255,0.08)",  gloss: "rgba(109,74,255,0.12)" },
};

function sparkPath(vals: number[], w = 200, h = 60) {
  const max = Math.max(1, ...vals);
  const step = w / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - (v / max) * (h - 6) - 3] as [number, number]);
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const cx = (x1 + x2) / 2;
    d += ` C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }
  return { line: d, area: `${d} L ${w},${h} L 0,${h} Z` };
}

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  tone?: AdminStatTone;
  series?: number[];
  loading?: boolean;
}

let __id = 0;

export function AdminStatCard({
  label,
  value,
  delta,
  deltaLabel = "vs last month",
  tone = "indigo",
  series,
  loading,
}: AdminStatCardProps) {
  const t = TONES[tone];
  const data = series && series.length > 1 ? series : [80, 110, 95, 130, 115, 155, 140, 180, 165, 210, 195, 245];
  const sp = sparkPath(data);
  const up = (delta ?? 0) >= 0;
  const gradId = `g-stat-${++__id}`;
  const areaGradId = `g-area-${__id}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 group"
      style={{
        background: "#ffffff",
        border: "1px solid #E4E7EF",
        boxShadow: "0 4px 20px rgba(109,74,255,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px rgba(109,74,255,0.10), 0 2px 6px rgba(0,0,0,0.04)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(109,74,255,0.05), 0 1px 3px rgba(0,0,0,0.03)";
      }}
    >
      {/* Top gloss line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] pointer-events-none rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${t.stroke}55, transparent)` }}
      />
      {/* Icon tint blob */}
      <div
        aria-hidden
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none blur-2xl opacity-60"
        style={{ background: t.gloss }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: "#667085" }}>{label}</div>
        <button
          className="text-sm leading-none transition hover:opacity-70"
          style={{ color: "#B4B8CC" }}
        >⋮</button>
      </div>
      <div
        className="text-3xl md:text-4xl font-black mt-2.5 tracking-tight tabular-nums relative z-10"
        style={{ color: "#15192C" }}
      >
        {loading ? "—" : value}
      </div>
      <div className="flex items-end justify-between mt-3 gap-3 relative z-10">
        {typeof delta === "number" ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full"
              style={{
                color: up ? "#15803D" : "#DC2626",
                background: up ? "rgba(21,128,61,0.08)" : "rgba(220,38,38,0.08)",
              }}
            >
              {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {up ? "+" : ""}{delta}%
            </span>
            <span className="font-semibold" style={{ color: "#667085" }}>{deltaLabel}</span>
          </div>
        ) : <span />}
        <svg viewBox="0 0 200 60" className="w-[55%] h-14 -mb-1">
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.stroke} stopOpacity="0.18" />
              <stop offset="100%" stopColor={t.stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sp.area} fill={`url(#${areaGradId})`} />
          <path d={sp.line} fill="none" stroke={t.stroke} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>;
}

export function AdminGlassCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: "#ffffff",
        border: "1px solid #E4E7EF",
        boxShadow: "0 4px 20px rgba(109,74,255,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(109,74,255,0.25), transparent)" }}
      />
      {children}
    </div>
  );
}
