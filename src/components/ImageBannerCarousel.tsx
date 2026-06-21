import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ShieldCheck, Zap, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import personAsset from "@/assets/rama-person-new.png.asset.json";

type SlideData = {
  category?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  link?: string;
  image_url?: string;
  color_preset?: string;
  bg_color?: string;
  accent_color?: string;
};

type BannerRow = {
  id: string;
  is_active: boolean;
  sort_order: number;
  data: SlideData;
};

// Cinematic dark backgrounds per preset — premium feel
const PRESET_BG: Record<string, { base: string; glow1: string; glow2: string; accent: string }> = {
  ruby: {
    base: "linear-gradient(to right, #4a0808, #1a0202 55%, #0a0101)",
    glow1: "rgba(220, 38, 38, 0.18)",
    glow2: "rgba(127, 29, 29, 0.14)",
    accent: "#f87171",
  },
  ocean: {
    base: "linear-gradient(to right, #082f4a, #061327 55%, #02060f)",
    glow1: "rgba(37, 99, 235, 0.20)",
    glow2: "rgba(30, 58, 138, 0.16)",
    accent: "#60a5fa",
  },
  emerald: {
    base: "linear-gradient(to right, #052e1c, #03190f 55%, #010a06)",
    glow1: "rgba(16, 185, 129, 0.18)",
    glow2: "rgba(6, 78, 59, 0.16)",
    accent: "#34d399",
  },
  violet: {
    base: "linear-gradient(to right, #2e1065, #1a0a3d 55%, #0a041a)",
    glow1: "rgba(139, 92, 246, 0.20)",
    glow2: "rgba(76, 29, 149, 0.16)",
    accent: "#a78bfa",
  },
  sunset: {
    base: "linear-gradient(to right, #4a1f02, #1a0a01 55%, #0a0501)",
    glow1: "rgba(245, 158, 11, 0.20)",
    glow2: "rgba(194, 65, 12, 0.16)",
    accent: "#fbbf24",
  },
  graphite: {
    base: "linear-gradient(to right, #1f2937, #0b0e14 55%, #050709)",
    glow1: "rgba(148, 163, 184, 0.14)",
    glow2: "rgba(71, 85, 105, 0.14)",
    accent: "#cbd5e1",
  },
};

const DEFAULT_SLIDES: BannerRow[] = [
  {
    id: "d1",
    is_active: true,
    sort_order: 1,
    data: {
      category: "বিশ্বস্ততার আরেক নাম",
      title: "Rama Sub",
      subtitle: "প্রিমিয়াম সাবস্ক্রিপশন এখন হাতের মুঠোয় — ১০০% নিরাপদ ও দ্রুত ডেলিভারি।",
      color_preset: "ruby",
      cta: "এখনই কিনুন",
      link: "/products",
    },
  },
  {
    id: "d2",
    is_active: true,
    sort_order: 2,
    data: {
      category: "সকল প্রিমিয়াম সার্ভিস এক ঠিকানায়",
      title: "One Trusted Store",
      subtitle: "Netflix, ChatGPT, Canva Pro সহ ৫০+ সার্ভিস — সাশ্রয়ী মূল্যে।",
      color_preset: "ocean",
      cta: "প্রোডাক্ট দেখুন",
      link: "/products",
    },
  },
  {
    id: "d3",
    is_active: true,
    sort_order: 3,
    data: {
      category: "ইনস্ট্যান্ট ডেলিভারি ২৪/৭",
      title: "Activate in Minutes",
      subtitle: "অর্ডার করার সাথে সাথেই অ্যাক্টিভেশন — কোনো অপেক্ষা নেই।",
      color_preset: "emerald",
      cta: "শুরু করুন",
      link: "/products",
    },
  },
];

const TRUST_BADGES = [
  { dot: "bg-green-400", label: "১০০% নিরাপদ" },
  { dot: "bg-sky-400", label: "ইনস্ট্যান্ট ডেলিভারি" },
  { dot: "bg-rose-400", label: "২৪/৭ সাপোর্ট" },
];

const BN = "'Hind Siliguri', system-ui, sans-serif";
const EN = "'Inter', system-ui, sans-serif";

export function ImageBannerCarousel() {
  const [rows, setRows] = useState<BannerRow[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      supabase
        .from("admin_records")
        .select("id, is_active, sort_order, data")
        .eq("kind", "banner_slider")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          if (!mounted) return;
          setRows((data ?? []) as BannerRow[]);
        });
    };
    load();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail;
      if (!detail?.kind || detail.kind === "banner_slider") load();
    };
    window.addEventListener("admin-records:changed", onChange);
    return () => {
      mounted = false;
      window.removeEventListener("admin-records:changed", onChange);
    };
  }, []);

  const slides = useMemo(
    () => (rows && rows.length > 0 ? rows : DEFAULT_SLIDES),
    [rows],
  );

  const next = useCallback(
    () => setActive((i) => (i + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(next, 6500);
    return () => window.clearInterval(id);
  }, [next, slides.length]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  return (
    <section className="px-3 sm:px-5 lg:px-8 pt-4 sm:pt-5 pb-3">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] sm:rounded-[36px] md:rounded-[40px] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/5 bg-[#0a0101] group">
        {slides.map((s, idx) => {
          const d = s.data || {};
          const eyebrow = d.category || "";
          const title = d.title || "Rama Sub";
          const subtitle = d.subtitle || "";
          const cta = d.cta || "এখনই কিনুন";
          const link = d.link || "/products";
          const preset = PRESET_BG[d.color_preset || "ruby"] || PRESET_BG.ruby;
          const personSrc = d.image_url || personAsset.url;
          const isActive = idx === active;

          // Split title to color the last word with accent
          const parts = title.trim().split(/\s+/);
          const head = parts.slice(0, -1).join(" ");
          const tail = parts.length > 1 ? parts[parts.length - 1] : "";

          return (
            <div
              key={s.id}
              className={`${
                isActive
                  ? "relative opacity-100 z-10"
                  : "absolute inset-0 opacity-0 z-0 pointer-events-none"
              } transition-opacity duration-700 ease-out`}
              aria-hidden={isActive ? undefined : true}
            >
              {/* Cinematic base */}
              <div className="absolute inset-0" style={{ background: preset.base }} />

              {/* Glow blobs */}
              <div
                className="absolute -right-20 -top-20 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
                style={{ background: preset.glow1 }}
              />
              <div
                className="absolute -left-20 bottom-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
                style={{ background: preset.glow2 }}
              />

              <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-4 sm:gap-6 px-5 sm:px-10 md:px-14 lg:px-16 py-6 sm:py-8 md:py-10 min-h-[340px] sm:min-h-[380px] md:min-h-[420px]">
                {/* LEFT — typography + actions */}
                <div className="order-2 md:order-1 min-w-0 text-center md:text-left flex flex-col items-center md:items-start gap-4 sm:gap-5 z-10">
                  {eyebrow && (
                    <span
                      className="inline-flex items-center px-3.5 sm:px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10"
                      style={{ fontFamily: BN, wordBreak: "keep-all" }}
                    >
                      <span
                        className="text-xs sm:text-sm font-medium tracking-wide"
                        style={{ color: preset.accent }}
                      >
                        {eyebrow}
                      </span>
                    </span>
                  )}

                  <div className="space-y-2 sm:space-y-3">
                    <h2
                      className="text-white font-black tracking-tight leading-[1.05] text-[34px] sm:text-[52px] md:text-[68px] lg:text-[76px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
                      style={{
                        fontFamily: /[\u0980-\u09FF]/.test(title) ? BN : EN,
                        wordBreak: "keep-all",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {tail ? (
                        <>
                          {head}{" "}
                          <span style={{ color: preset.accent }}>{tail}</span>
                        </>
                      ) : (
                        title
                      )}
                    </h2>

                    {subtitle && (
                      <p
                        className="text-gray-300/85 text-sm sm:text-base md:text-lg max-w-lg mx-auto md:mx-0"
                        style={{
                          fontFamily: BN,
                          wordBreak: "keep-all",
                          lineHeight: 1.6,
                        }}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>

                  {/* Frosted glass feature pills */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5">
                    {TRUST_BADGES.map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        style={{ fontFamily: BN, wordBreak: "keep-all" }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                        <span className="text-[11px] sm:text-xs text-gray-200">
                          {b.label}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5 sm:gap-3 pt-1">
                    <Link
                      to={link as never}
                      className="inline-flex items-center justify-center rounded-2xl px-7 sm:px-9 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{
                        fontFamily: BN,
                        background: `linear-gradient(135deg, ${preset.accent}, color-mix(in oklab, ${preset.accent} 70%, #000))`,
                        boxShadow: `0 10px 30px -8px ${preset.accent}55`,
                      }}
                    >
                      {cta}
                    </Link>
                    <Link
                      to="/categories"
                      className="inline-flex items-center justify-center rounded-2xl px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white bg-white/[0.06] border border-white/10 backdrop-blur-md hover:bg-white/[0.12] transition-all"
                      style={{ fontFamily: BN }}
                    >
                      ক্যাটাগরি দেখুন
                    </Link>
                  </div>
                </div>

                {/* RIGHT — visual subject */}
                <div className="order-1 md:order-2 relative flex items-end justify-center md:justify-end h-full">
                  {/* Sparkle accents */}
                  <Sparkles className="absolute top-6 right-8 w-5 h-5 sm:w-6 sm:h-6 text-white/40 animate-pulse" />
                  <Sparkles className="absolute bottom-10 left-6 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/30 animate-pulse [animation-delay:600ms]" />

                  <div className="relative">
                    {/* Person glow */}
                    <div
                      className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-60 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, ${preset.glow1} 0%, transparent 65%)`,
                      }}
                    />
                    <img
                      src={personSrc}
                      alt={title}
                      className="relative block h-[220px] sm:h-[300px] md:h-[380px] lg:h-[420px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.55)] select-none pointer-events-none"
                      draggable={false}
                      loading={idx === 0 ? "eager" : "lazy"}
                      width={900}
                      height={900}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>

            <div className="absolute bottom-5 sm:bottom-6 right-6 sm:right-10 md:right-14 z-20 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActive(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === active ? "w-10 bg-white" : "w-3 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
