import { Profiler, useSyncExternalStore, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { perfStore, type PerfSnapshot } from "@/lib/perfStore";
import { isPerfEnabled } from "@/lib/scrollPerfMonitor";

/**
 * Wrap a subtree to record its render durations into perfStore.
 * No-op (returns children directly) when perf monitor is disabled, so
 * production users pay zero overhead.
 */
export function ProfiledSection({ id, children }: { id: string; children: ReactNode }) {
  if (!isPerfEnabled()) return <>{children}</>;
  const onRender: ProfilerOnRenderCallback = (profilerId, _phase, actualDuration) => {
    perfStore.recordRender(profilerId, actualDuration);
  };
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

type Score = "good" | "warn" | "poor";

function scoreFps(fps: number): Score {
  if (fps === 0) return "good"; // no data yet
  if (fps >= 55) return "good";
  if (fps >= 40) return "warn";
  return "poor";
}
function scoreFrameMs(ms: number): Score {
  if (ms === 0) return "good";
  if (ms <= 32) return "good";
  if (ms <= 80) return "warn";
  return "poor";
}
function scoreInp(ms: number): Score {
  if (ms <= 200) return "good";
  if (ms <= 500) return "warn";
  return "poor";
}
function scoreCls(v: number): Score {
  if (v <= 0.1) return "good";
  if (v <= 0.25) return "warn";
  return "poor";
}
function scoreLongTasks(count: number): Score {
  if (count <= 5) return "good";
  if (count <= 15) return "warn";
  return "poor";
}

const SCORE_STYLES: Record<Score, { dot: string; text: string; ring: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200" },
  poor: { dot: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200" },
};

function MetricCard({
  label,
  value,
  unit,
  hint,
  score,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  score: Score;
}) {
  const s = SCORE_STYLES[score];
  return (
    <div className={`rounded-2xl bg-white/95 p-4 ring-1 ${s.ring} shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)]`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-extrabold ${s.text}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-slate-400">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function useSnapshot(): PerfSnapshot {
  return useSyncExternalStore(perfStore.subscribe, perfStore.get, perfStore.get);
}

export function PerfReportSection() {
  if (!isPerfEnabled()) return null;
  return <PerfReportSectionInner />;
}

function PerfReportSectionInner() {
  const s = useSnapshot();

  const fpsScore = scoreFps(s.avgFps || s.liveFps);
  const frameScore = scoreFrameMs(s.worstFrameMs);
  const inpScore = scoreInp(s.worstInpMs);
  const clsScore = scoreCls(s.cls);
  const ltScore = scoreLongTasks(s.longTaskCount);

  // Top 6 slowest components by total render time.
  const slow = s.components.slice(0, 6);
  const maxTotal = slow[0]?.totalMs ?? 1;

  return (
    <section
      aria-label="Performance report (dev only)"
      className="mx-auto max-w-[1440px] px-4 md:px-10 py-10"
    >
      <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-sky-50 p-6 md:p-8 ring-1 ring-violet-200/60 shadow-[0_20px_50px_-30px_rgba(124,58,237,0.35)]">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em]">
              Dev · Perf Report
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-slate-900">
              Scroll smoothness & component cost
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Lighthouse-style snapshot from this session. Scroll the page to populate FPS metrics.
              {s.liveFps > 0 && <span className="ml-2 text-emerald-700 font-bold">● live: {s.liveFps} fps</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => perfStore.reset()}
            className="h-9 rounded-full bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:ring-violet-300 transition"
          >
            Reset metrics
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Avg FPS"
            value={s.avgFps || "—"}
            unit={s.avgFps ? "fps" : ""}
            hint={`worst frame ${s.worstFrameMs.toFixed(0)}ms`}
            score={fpsScore}
          />
          <MetricCard
            label="Dropped frames"
            value={s.droppedFrames}
            hint={`>32ms · ${(s.scrollTimeMs / 1000).toFixed(1)}s scrolled`}
            score={frameScore}
          />
          <MetricCard
            label="INP (worst)"
            value={s.worstInpMs ? s.worstInpMs.toFixed(0) : "—"}
            unit={s.worstInpMs ? "ms" : ""}
            hint="Input → next frame"
            score={inpScore}
          />
          <MetricCard
            label="Long tasks"
            value={s.longTaskCount}
            unit={s.longTaskCount ? "" : ""}
            hint={`worst ${s.worstLongTaskMs.toFixed(0)}ms · total ${(s.longTaskTotalMs / 1000).toFixed(1)}s`}
            score={ltScore}
          />
          <MetricCard
            label="CLS"
            value={s.cls.toFixed(3)}
            hint="Cumulative Layout Shift"
            score={clsScore}
          />
        </div>

        <div className="mt-6 rounded-2xl bg-white/95 p-5 ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800">Slowest components</h3>
            <span className="text-[11px] text-slate-500">React Profiler · cumulative render ms</span>
          </div>
          {slow.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No render data yet — interact with the page (scroll, click) to populate.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {slow.map((c) => {
                const pct = Math.max(2, Math.round((c.totalMs / maxTotal) * 100));
                const tone =
                  c.totalMs > 200
                    ? "bg-rose-500"
                    : c.totalMs > 80
                    ? "bg-amber-500"
                    : "bg-emerald-500";
                return (
                  <li key={c.id} className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{c.id}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">
                          {c.count}× · last {c.lastMs.toFixed(1)}ms · worst {c.worstMs.toFixed(1)}ms
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${tone} transition-[width] duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="self-center text-sm font-extrabold text-slate-900 tabular-nums">
                      {c.totalMs.toFixed(0)}ms
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Visible in dev, or in production with <code className="rounded bg-slate-100 px-1.5 py-0.5">?perf=1</code>{" "}
          / <code className="rounded bg-slate-100 px-1.5 py-0.5">localStorage.perfMonitor=1</code>.
        </p>
      </div>
    </section>
  );
}
