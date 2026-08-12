import { TrendingDown, TrendingUp } from "lucide-react";

export type AdminStatTone = "indigo" | "rose" | "emerald" | "violet" | "sky";

const TONES: Record<AdminStatTone, { tint: string; stroke: string; fill: string }> = {
  indigo:  { tint: "from-indigo-50/80 via-white to-white",      stroke: "#6366f1", fill: "rgba(99,102,241,0.12)" },
  rose:    { tint: "from-rose-50/80 via-white to-white",        stroke: "#f43f5e", fill: "rgba(244,63,94,0.12)" },
  emerald: { tint: "from-emerald-50/80 via-white to-white",     stroke: "#10b981", fill: "rgba(16,185,129,0.12)" },
  sky:     { tint: "from-sky-50/80 via-white to-white",         stroke: "#0ea5e9", fill: "rgba(14,165,233,0.12)" },
  violet:  { tint: "from-violet-50/80 via-white to-white",      stroke: "#8b5cf6", fill: "rgba(139,92,246,0.15)" },
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

  return (
    <div
      className={`admin-card relative overflow-hidden rounded-[24px] p-6 border border-slate-200/50 bg-gradient-to-br ${t.tint} shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_30px_-12px_rgba(15,23,42,0.06)]`}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm font-extrabold text-slate-700">{label}</div>
        <button className="text-slate-500 hover:text-slate-800 leading-none">⋮</button>
      </div>
      <div className="text-3xl md:text-4xl font-black text-slate-950 mt-3 tracking-tight tabular-nums">
        {loading ? "—" : value}
      </div>
      <div className="flex items-end justify-between mt-3 gap-3">
        {typeof delta === "number" ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-blue-600" : "text-rose-600"}`}>
              {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {up ? "+" : ""}{delta}%
            </span>
            <span className="font-semibold text-slate-600">{deltaLabel}</span>
          </div>
        ) : <span />}
        <svg viewBox="0 0 200 60" className="w-[55%] h-14 -mb-1">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.fill} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path d={sp.area} fill={`url(#${gradId})`} />
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
    <div className={`admin-card rounded-2xl bg-white ${className}`}>
      {children}
    </div>
  );
}
