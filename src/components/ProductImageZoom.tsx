import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getZoomSettings, DEFAULT_ZOOM_SETTINGS } from "@/lib/zoom-settings.functions";
import { optimizeSupabaseImage } from "@/lib/image-url";

type Props = { src: string; alt: string };

export function ProductImageZoom({ src, alt }: Props) {
  const load = useServerFn(getZoomSettings);
  const { data: cfg = DEFAULT_ZOOM_SETTINGS } = useQuery({
    queryKey: ["zoom-settings"],
    queryFn: () => load(),
    staleTime: 5 * 60 * 1000,
  });

  const [hovering, setHovering] = useState(false);
  const [clickActive, setClickActive] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset on trigger change
  useEffect(() => { setClickActive(false); setHovering(false); }, [cfg.trigger]);

  const active = cfg.enabled && (cfg.trigger === "hover" ? hovering : clickActive);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cfg.enabled || !cfg.follow_cursor) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (imgRef.current) imgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  const onLeave = () => {
    setHovering(false);
    if (imgRef.current) imgRef.current.style.transformOrigin = "center center";
  };

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden select-none"
      style={{ cursor: cfg.enabled ? (cfg.trigger === "hover" ? "zoom-in" : "pointer") : "default" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      onClick={() => cfg.trigger === "click" && setClickActive((v) => !v)}
      aria-label={`${alt} — ${cfg.trigger === "hover" ? "hover" : "click"} to zoom`}
    >
      <img
        ref={imgRef}
        src={optimizeSupabaseImage(src, { width: 1400, quality: 80 })}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        width={1400}
        height={1400}
        style={{
          transform: active ? `scale(${cfg.scale})` : "scale(1)",
          transition: `transform ${cfg.duration_ms}ms ${cfg.easing}`,
          transformOrigin: "center center",
        }}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== src) img.src = src;
        }}
      />
    </div>
  );
}
