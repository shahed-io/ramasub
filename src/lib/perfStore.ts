/**
 * Tiny shared store for performance telemetry.
 * Both the scroll perf monitor and the React profiler push into this store;
 * the homepage report panel reads from it via useSyncExternalStore.
 */

export type ComponentRender = {
  id: string;
  /** Total ms spent rendering this component since page load. */
  totalMs: number;
  /** Number of times this component has rendered. */
  count: number;
  /** Worst single render in ms. */
  worstMs: number;
  /** Last render duration in ms. */
  lastMs: number;
};

export type PerfSnapshot = {
  /** Live FPS (last 1s sample, while scrolling). 0 if idle. */
  liveFps: number;
  /** Avg FPS across all scroll sessions so far. */
  avgFps: number;
  /** Worst single frame duration in ms across all scroll sessions. */
  worstFrameMs: number;
  /** Total dropped frames (>32ms) across all scroll sessions. */
  droppedFrames: number;
  /** Total scrolled time in ms. */
  scrollTimeMs: number;
  /** Number of long tasks (>50ms) observed. */
  longTaskCount: number;
  /** Total ms spent in long tasks. */
  longTaskTotalMs: number;
  /** Worst long task duration in ms. */
  worstLongTaskMs: number;
  /** Worst INP candidate in ms. */
  worstInpMs: number;
  /** Cumulative Layout Shift score. */
  cls: number;
  /** Per-component render aggregates, sorted by totalMs desc when read. */
  components: ComponentRender[];
  /** Monotonic counter — increments on every change for cheap diffing. */
  rev: number;
};

const initial: PerfSnapshot = {
  liveFps: 0,
  avgFps: 0,
  worstFrameMs: 0,
  droppedFrames: 0,
  scrollTimeMs: 0,
  longTaskCount: 0,
  longTaskTotalMs: 0,
  worstLongTaskMs: 0,
  worstInpMs: 0,
  cls: 0,
  components: [],
  rev: 0,
};

let state: PerfSnapshot = initial;
const componentMap = new Map<string, ComponentRender>();
const listeners = new Set<() => void>();
let scheduled = false;

function scheduleEmit() {
  if (scheduled) return;
  scheduled = true;
  // Throttle to next frame so high-frequency profiler callbacks don't thrash React.
  requestAnimationFrame(() => {
    scheduled = false;
    state = {
      ...state,
      components: Array.from(componentMap.values()).sort((a, b) => b.totalMs - a.totalMs),
      rev: state.rev + 1,
    };
    for (const l of listeners) l();
  });
}

export const perfStore = {
  get(): PerfSnapshot {
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Patch top-level metrics. */
  patch(p: Partial<Omit<PerfSnapshot, "components" | "rev">>) {
    state = { ...state, ...p };
    scheduleEmit();
  },
  /** Record a single render of a profiled component. */
  recordRender(id: string, actualDurationMs: number) {
    const prev = componentMap.get(id);
    if (prev) {
      prev.totalMs += actualDurationMs;
      prev.count += 1;
      prev.lastMs = actualDurationMs;
      if (actualDurationMs > prev.worstMs) prev.worstMs = actualDurationMs;
    } else {
      componentMap.set(id, {
        id,
        totalMs: actualDurationMs,
        count: 1,
        worstMs: actualDurationMs,
        lastMs: actualDurationMs,
      });
    }
    scheduleEmit();
  },
  reset() {
    state = { ...initial, rev: state.rev + 1 };
    componentMap.clear();
    for (const l of listeners) l();
  },
};
