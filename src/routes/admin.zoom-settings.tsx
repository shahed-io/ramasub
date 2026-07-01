import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, ZoomIn, MousePointerClick, Gauge } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  getZoomSettings,
  saveZoomSettings,
  DEFAULT_ZOOM_SETTINGS,
  type ZoomSettings,
} from "@/lib/zoom-settings.functions";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/zoom-settings")({
  component: ZoomSettingsPage,
  head: () => ({
    meta: [{ title: "Product Image Zoom — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

function ZoomSettingsPage() {
  const { t } = useAdminLang();
  const load = useServerFn(getZoomSettings);
  const save = useServerFn(saveZoomSettings);
  const [s, setS] = useState<ZoomSettings>(DEFAULT_ZOOM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [clickActive, setClickActive] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    load()
      .then((d) => setS(d))
      .finally(() => setLoading(false));
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: s });
      toast.success(t("Zoom settings saved", "জুম সেটিংস সংরক্ষিত"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ZoomSettings>(k: K, v: ZoomSettings[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!s.follow_cursor) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (imgRef.current) imgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  const active = s.trigger === "hover" ? hovering : clickActive;

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <ZoomIn className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t("Product Image Zoom", "প্রোডাক্ট ইমেজ জুম")}
              </h1>
              <p className="text-white/85 text-sm mt-1">
                {t(
                  "Customize how the product image zooms on desktop & mobile.",
                  "ডেস্কটপ ও মোবাইল—সব ডিভাইসে প্রোডাক্ট ইমেজ কেমন করে জুম হবে সেটা কাস্টমাইজ করো।",
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Settings */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
                <Gauge className="w-4 h-4" />
              </span>
              {t("Settings", "সেটিংস")}
            </h2>

            {/* Enable */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {t("Enable image zoom", "ইমেজ জুম চালু")}
                </div>
                <div className="text-xs text-slate-500">
                  {t("Turn zoom on or off site-wide.", "সাইটজুড়ে জুম চালু/বন্ধ করো।")}
                </div>
              </div>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                className="w-5 h-5 accent-indigo-600"
              />
            </label>

            {/* Trigger */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">
                {t("Trigger", "ট্রিগার")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["hover", "click"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("trigger", v)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      s.trigger === v
                        ? "bg-indigo-600 text-white border-indigo-600 shadow"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {v === "hover" ? (
                      <>
                        <MousePointerClick className="w-4 h-4" />
                        {t("Hover (desktop) / Tap (mobile)", "হোভার / ট্যাপ")}
                      </>
                    ) : (
                      <>
                        <MousePointerClick className="w-4 h-4" />
                        {t("Click toggle", "ক্লিক টগল")}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale */}
            <Slider
              label={t("Zoom level", "জুম লেভেল")}
              value={s.scale}
              min={1.1}
              max={4}
              step={0.05}
              unit="x"
              onChange={(v) => set("scale", v)}
            />

            {/* Duration */}
            <Slider
              label={t("Animation speed", "অ্যানিমেশন স্পিড")}
              value={s.duration_ms}
              min={0}
              max={1500}
              step={25}
              unit="ms"
              onChange={(v) => set("duration_ms", v)}
              hint={t("Lower = faster, higher = smoother.", "কম = দ্রুত, বেশি = মসৃণ।")}
            />

            {/* Easing */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">
                {t("Easing curve", "ইজিং কার্ভ")}
              </div>
              <select
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900"
                value={s.easing}
                onChange={(e) => set("easing", e.target.value as ZoomSettings["easing"])}
              >
                <option value="linear">linear</option>
                <option value="ease">ease</option>
                <option value="ease-in">ease-in</option>
                <option value="ease-out">ease-out (recommended)</option>
                <option value="ease-in-out">ease-in-out</option>
              </select>
            </div>

            {/* Follow cursor */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {t("Follow cursor", "কার্সর ফলো করবে")}
                </div>
                <div className="text-xs text-slate-500">
                  {t("Pan the zoomed image toward the mouse position.", "কার্সর যেখানে যাবে, জুম সেই অংশে যাবে।")}
                </div>
              </div>
              <input
                type="checkbox"
                checked={s.follow_cursor}
                onChange={(e) => set("follow_cursor", e.target.checked)}
                className="w-5 h-5 accent-indigo-600"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("Save settings", "সেটিংস সংরক্ষণ")}
              </button>
              <button
                onClick={() => setS(DEFAULT_ZOOM_SETTINGS)}
                className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-white text-slate-700 border border-slate-200 font-semibold hover:bg-slate-50"
              >
                {t("Reset to default", "ডিফল্টে ফিরিয়ে আনো")}
              </button>
            </div>
          </section>

          {/* Live Preview */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                <ZoomIn className="w-4 h-4" />
              </span>
              {t("Live preview", "লাইভ প্রিভিউ")}
            </h2>
            <p className="text-xs text-slate-500">
              {s.trigger === "hover"
                ? t("Move your mouse over the image.", "ইমেজের উপর মাউস আনুন।")
                : t("Click the image to toggle zoom.", "জুম করতে ইমেজে ক্লিক করুন।")}
            </p>
            <div
              ref={previewRef}
              className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 select-none"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => {
                setHovering(false);
                if (imgRef.current) imgRef.current.style.transformOrigin = "center center";
              }}
              onMouseMove={handleMove}
              onClick={() => s.trigger === "click" && setClickActive((v) => !v)}
              style={{ cursor: s.enabled ? (s.trigger === "hover" ? "zoom-in" : "pointer") : "default" }}
            >
              <img
                ref={imgRef}
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80"
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: s.enabled && active ? `scale(${s.scale})` : "scale(1)",
                  transition: `transform ${s.duration_ms}ms ${s.easing}`,
                }}
              />
            </div>
            <div className="text-xs text-slate-500 grid grid-cols-2 gap-2">
              <span>Scale: <b>{s.scale.toFixed(2)}x</b></span>
              <span>Speed: <b>{s.duration_ms}ms</b></span>
              <span>Trigger: <b>{s.trigger}</b></span>
              <span>Easing: <b>{s.easing}</b></span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange, hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs font-bold text-indigo-600 tabular-nums">
          {typeof value === "number" && unit === "x" ? value.toFixed(2) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
