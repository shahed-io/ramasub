import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen image viewer with click/wheel/pinch zoom + drag panning.
 * Double-click toggles 1x ↔ 2.5x. Escape closes.
 */
export function ImageLightbox({ src, alt = "", open, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  const reset = () => { setScale(1); setTx(0); setTy(0); };

  useEffect(() => {
    if (!open) return;
    reset();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(6, s + 0.5));
      else if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
      else if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const clamp = (s: number) => Math.max(1, Math.min(6, s));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => clamp(s + (e.deltaY < 0 ? 0.3 : -0.3)));
  };

  const onDoubleClick = () => {
    if (scale > 1) reset();
    else setScale(2.5);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setTx(dragging.current.tx + (e.clientX - dragging.current.x));
    setTy(dragging.current.ty + (e.clientY - dragging.current.y));
  };
  const onPointerUp = () => { dragging.current = null; };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = { dist: Math.hypot(dx, dy), scale };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      setScale(clamp(pinch.current.scale * (d / pinch.current.dist)));
    }
  };
  const onTouchEnd = () => { pinch.current = null; };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_180ms_ease-out]"
      onClick={onClose}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Toolbar */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => clamp(s - 0.5))}
          className="w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="min-w-[52px] text-center text-white text-sm font-semibold tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => clamp(s + 0.5))}
          className="w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={reset}
          className="w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 grid place-items-center rounded-full bg-white text-slate-900 hover:scale-105 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
        onWheel={onWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={onDoubleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
            transition: dragging.current ? "none" : "transform 180ms ease-out",
            touchAction: "none",
          }}
          className="max-h-[92vh] max-w-[94vw] object-contain will-change-transform"
        />
      </div>

      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium">
        Double-click / scroll / pinch to zoom • Drag to pan • Esc to close
      </div>
    </div>
  );
}
