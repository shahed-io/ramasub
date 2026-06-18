/**
 * Scroll performance instrumentation.
 *
 * Logs to console:
 *  - FPS (rAF-based, sampled every 1s) — only while user is scrolling
 *  - Long tasks (>50ms) via PerformanceObserver
 *  - Input delay (pointer/wheel/touch → next frame) — proxy for INP
 *  - Worst-frame summary every 5s during scroll
 *
 * Auto-enabled in dev; in prod, enable via `?perf=1` query OR `localStorage.perfMonitor=1`.
 *
 * All logs prefixed with `[perf]` for easy filtering.
 */

import { perfStore } from "./perfStore";

type FrameSample = { t: number; dt: number };

const PREFIX = "[perf]";
const COLOR_OK = "color:#10b981;font-weight:bold";
const COLOR_WARN = "color:#f59e0b;font-weight:bold";
const COLOR_BAD = "color:#ef4444;font-weight:bold";

function styleFor(fps: number) {
  if (fps >= 55) return COLOR_OK;
  if (fps >= 40) return COLOR_WARN;
  return COLOR_BAD;
}

export function isPerfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Opt-in only — instrumentation itself has cost (rAF loop, Profiler,
  // store-driven re-renders), so we never auto-enable, even in dev.
  // Enable with ?perf=1 in the URL, or `localStorage.perfMonitor = "1"`.
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("perf") === "1") return true;
    if (localStorage.getItem("perfMonitor") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function startScrollPerfMonitor(): () => void {
  if (!isPerfEnabled()) return () => {};

  let rafId = 0;
  let lastFrame = performance.now();
  let scrolling = false;
  let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let frames: FrameSample[] = [];
  let secondBuffer: number[] = [];
  let lastSecondLog = performance.now();
  let scrollStart = 0;
  let worstFrame = 0;
  let droppedFrames = 0;

  // Running totals across all scroll sessions — feed the report panel.
  let totalScrollMs = 0;
  let totalFrameMs = 0;
  let totalFrameCount = 0;
  let allTimeWorstFrame = 0;
  let allTimeDroppedFrames = 0;
  let longTaskCount = 0;
  let longTaskTotalMs = 0;
  let worstLongTaskMs = 0;
  let worstInpMs = 0;
  let clsValue = 0;

  const pushStore = () => {
    const avgFps = totalFrameCount > 0 ? Math.round(1000 / (totalFrameMs / totalFrameCount)) : 0;
    perfStore.patch({
      avgFps,
      worstFrameMs: allTimeWorstFrame,
      droppedFrames: allTimeDroppedFrames,
      scrollTimeMs: totalScrollMs,
      longTaskCount,
      longTaskTotalMs,
      worstLongTaskMs,
      worstInpMs,
      cls: clsValue,
    });
  };

  console.log(
    `%c${PREFIX} monitor armed — scroll the page to see FPS / dropped frames / input delay`,
    "color:#8b5cf6;font-weight:bold",
  );

  const tick = () => {
    const now = performance.now();
    const dt = now - lastFrame;
    lastFrame = now;

    if (scrolling) {
      secondBuffer.push(dt);
      frames.push({ t: now, dt });
      if (dt > worstFrame) worstFrame = dt;
      if (dt > allTimeWorstFrame) allTimeWorstFrame = dt;
      if (dt > 32) {
        droppedFrames++;
        allTimeDroppedFrames++;
      }
      totalFrameMs += dt;
      totalFrameCount += 1;

      if (now - lastSecondLog >= 1000) {
        const avg = secondBuffer.reduce((a, b) => a + b, 0) / secondBuffer.length;
        const fps = Math.round(1000 / avg);
        console.log(
          `%c${PREFIX} ${fps} fps%c  (avg frame ${avg.toFixed(1)}ms, worst ${Math.max(...secondBuffer).toFixed(1)}ms, samples ${secondBuffer.length})`,
          styleFor(fps),
          "color:#94a3b8",
        );
        perfStore.patch({ liveFps: fps });
        pushStore();
        secondBuffer = [];
        lastSecondLog = now;
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  const onScrollEnd = () => {
    if (!scrolling) return;
    scrolling = false;
    const duration = performance.now() - scrollStart;
    perfStore.patch({ liveFps: 0 });
    if (duration < 200 || frames.length === 0) {
      frames = [];
      secondBuffer = [];
      worstFrame = 0;
      droppedFrames = 0;
      return;
    }
    totalScrollMs += duration;
    const avgDt = frames.reduce((a, b) => a + b.dt, 0) / frames.length;
    const avgFps = Math.round(1000 / avgDt);
    console.log(
      `%c${PREFIX} scroll session done%c  ${(duration / 1000).toFixed(1)}s · avg ${avgFps} fps · worst frame ${worstFrame.toFixed(1)}ms · ${droppedFrames} dropped (>32ms)`,
      styleFor(avgFps),
      "color:#94a3b8",
    );
    pushStore();
    frames = [];
    secondBuffer = [];
    worstFrame = 0;
    droppedFrames = 0;
  };

  const onScroll = () => {
    if (!scrolling) {
      scrolling = true;
      scrollStart = performance.now();
      lastSecondLog = scrollStart;
      secondBuffer = [];
      frames = [];
      worstFrame = 0;
      droppedFrames = 0;
      console.log(`%c${PREFIX} scroll started`, "color:#8b5cf6");
    }
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(onScrollEnd, 250);
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  // Input delay: time from input event → next animation frame.
  // Proxy for INP responsiveness during scroll.
  const measureInputDelay = (label: string) => (e: Event) => {
    const start = performance.now();
    const eventTime = (e as Event & { timeStamp: number }).timeStamp || start;
    requestAnimationFrame((frameTime) => {
      const delay = frameTime - eventTime;
      if (delay > worstInpMs) {
        worstInpMs = delay;
        pushStore();
      }
      if (delay > 100) {
        console.log(
          `%c${PREFIX} input delay (${label}) ${delay.toFixed(0)}ms`,
          delay > 200 ? COLOR_BAD : COLOR_WARN,
        );
      }
    });
  };
  const wheelHandler = measureInputDelay("wheel");
  const touchHandler = measureInputDelay("touchstart");
  const pointerHandler = measureInputDelay("pointerdown");
  window.addEventListener("wheel", wheelHandler, { passive: true });
  window.addEventListener("touchstart", touchHandler, { passive: true });
  window.addEventListener("pointerdown", pointerHandler, { passive: true });

  // Long tasks (>50ms blocking main thread).
  let longTaskObserver: PerformanceObserver | null = null;
  try {
    if ("PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const dur = entry.duration;
          if (dur < 50) continue;
          longTaskCount += 1;
          longTaskTotalMs += dur;
          if (dur > worstLongTaskMs) worstLongTaskMs = dur;
          console.log(
            `%c${PREFIX} long task ${dur.toFixed(0)}ms%c  @${(entry.startTime / 1000).toFixed(1)}s${scrolling ? " (during scroll)" : ""}`,
            dur > 200 ? COLOR_BAD : COLOR_WARN,
            "color:#94a3b8",
          );
        }
        pushStore();
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });
    }
  } catch {
    /* not supported */
  }

  // INP via event timing (where supported — Chromium-based browsers).
  let eventObserver: PerformanceObserver | null = null;
  try {
    if ("PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes?.includes("event")) {
      eventObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const ev = entry as PerformanceEntry & { interactionId?: number; name: string };
          const dur = entry.duration;
          if (!ev.interactionId || dur < 100) continue;
          if (dur > worstInpMs) {
            worstInpMs = dur;
            pushStore();
          }
          console.log(
            `%c${PREFIX} slow interaction "${ev.name}" ${dur.toFixed(0)}ms (INP candidate)`,
            dur > 200 ? COLOR_BAD : COLOR_WARN,
          );
        }
      });
      eventObserver.observe({ type: "event", buffered: true, durationThreshold: 100 } as PerformanceObserverInit);
    }
  } catch {
    /* not supported */
  }

  // CLS via layout-shift entries.
  let clsObserver: PerformanceObserver | null = null;
  try {
    if ("PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const ls = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (ls.hadRecentInput) continue;
          clsValue += ls.value;
        }
        pushStore();
      });
      clsObserver.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
    }
  } catch {
    /* not supported */
  }

  return () => {
    cancelAnimationFrame(rafId);
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", wheelHandler);
    window.removeEventListener("touchstart", touchHandler);
    window.removeEventListener("pointerdown", pointerHandler);
    longTaskObserver?.disconnect();
    eventObserver?.disconnect();
    clsObserver?.disconnect();
  };
}
