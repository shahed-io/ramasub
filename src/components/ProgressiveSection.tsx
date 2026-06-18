import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts `children` only when the wrapper is within `rootMargin` of the viewport.
 * Until then, renders `fallback` (a skeleton with the SAME height/layout).
 *
 * Matching heights ensures zero CLS when content swaps in.
 *
 * Once mounted, stays mounted — no flicker if the user scrolls back.
 */
export function ProgressiveSection({
  children,
  fallback,
  rootMargin = "600px 0px",
  eager = false,
}: {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    // Fallback for environments without IO (very old browsers, SSR hydration race).
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : fallback}</div>;
}
