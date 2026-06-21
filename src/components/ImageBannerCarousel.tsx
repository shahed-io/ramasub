import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import personAsset from "@/assets/rama-person-cutout.png.asset.json";

type SlideData = {
  category?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  link?: string;
  secondary_cta?: string;
  secondary_link?: string;
  image_url?: string;
  color_preset?: string;
};

type BannerRow = {
  id: string;
  is_active: boolean;
  sort_order: number;
  data: SlideData;
};

// Premium glossy palettes — richer, luminous mid-tones so the person blends
// into a glowing backdrop instead of a flat black void.
const PRESET: Record<
  string,
  { gradient: string; sweep: string; halo: string; halo2: string; accent: string; pillBg: string; pillBorder: string }
> = {
  ruby: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #ff4d6d 0%, #e11d48 30%, #9f1239 60%, #4c0519 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(255,180,200,0.45), transparent 65%)",
    halo: "rgba(255,100,140,0.65)",
    halo2: "rgba(255,180,200,0.50)",
    accent: "#ffd7e0",
    pillBg: "rgba(255,255,255,0.18)",
    pillBorder: "rgba(255,220,230,0.55)",
  },
  sapphire: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #3b82f6 0%, #1d4ed8 30%, #1e3a8a 60%, #0b1538 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(186,230,253,0.45), transparent 65%)",
    halo: "rgba(96,165,250,0.65)",
    halo2: "rgba(186,230,253,0.50)",
    accent: "#dbeafe",
    pillBg: "rgba(255,255,255,0.18)",
    pillBorder: "rgba(219,234,254,0.55)",
  },
  emerald: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #10b981 0%, #059669 30%, #047857 60%, #042f23 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(167,243,208,0.45), transparent 65%)",
    halo: "rgba(52,211,153,0.65)",
    halo2: "rgba(167,243,208,0.50)",
    accent: "#d1fae5",
    pillBg: "rgba(255,255,255,0.18)",
    pillBorder: "rgba(209,250,229,0.55)",
  },
  ocean: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #3b82f6 0%, #1d4ed8 30%, #1e3a8a 60%, #0b1538 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(186,230,253,0.45), transparent 65%)",
    halo: "rgba(96,165,250,0.65)", halo2: "rgba(186,230,253,0.50)", accent: "#dbeafe",
    pillBg: "rgba(255,255,255,0.18)", pillBorder: "rgba(219,234,254,0.55)",
  },
  violet: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #a855f7 0%, #7c3aed 30%, #5b21b6 60%, #1e0b4a 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(221,214,254,0.45), transparent 65%)",
    halo: "rgba(167,139,250,0.65)", halo2: "rgba(221,214,254,0.50)", accent: "#ede9fe",
    pillBg: "rgba(255,255,255,0.18)", pillBorder: "rgba(237,233,254,0.55)",
  },
  sunset: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #fb923c 0%, #f97316 30%, #c2410c 60%, #431407 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(254,215,170,0.45), transparent 65%)",
    halo: "rgba(251,146,60,0.65)", halo2: "rgba(254,215,170,0.50)", accent: "#ffedd5",
    pillBg: "rgba(255,255,255,0.18)", pillBorder: "rgba(255,237,213,0.55)",
  },
  graphite: {
    gradient:
      "radial-gradient(120% 95% at 70% 30%, #94a3b8 0%, #475569 30%, #1e293b 60%, #0b1220 100%)",
    sweep: "radial-gradient(70% 55% at 80% 25%, rgba(226,232,240,0.35), transparent 65%)",
    halo: "rgba(203,213,225,0.55)", halo2: "rgba(226,232,240,0.40)", accent: "#f1f5f9",
    pillBg: "rgba(255,255,255,0.18)", pillBorder: "rgba(241,245,249,0.50)",
  },
};

const DEFAULT_SLIDES: BannerRow[] = [
  {
    id: "d1", is_active: true, sort_order: 1,
    data: {
      category: "বিশ্বস্ততার আরেক নাম",
      title: "Rama Sub",
      subtitle: "প্রিমিয়াম সাবস্ক্রিপশন এখন হাতের মুঠোয় — ১০০% নিরাপদ ও দ্রুত ডেলিভারি।",
      color_preset: "ruby",
      cta: "এখনই কিনুন", link: "/products",
      secondary_cta: "ক্যাটাগরি দেখুন", secondary_link: "/categories",
    },
  },
  {
    id: "d2", is_active: true, sort_order: 2,
    data: {
      category: "সকল প্রিমিয়াম সার্ভিস এক ঠিকানায়",
      title: "One Trusted Store",
      subtitle: "Netflix, ChatGPT, Canva Pro সহ ৫০+ সার্ভিস — সাশ্রয়ী মূল্যে।",
      color_preset: "sapphire",
      cta: "প্রোডাক্ট দেখুন", link: "/products",
      secondary_cta: "ক্যাটাগরি দেখুন", secondary_link: "/categories",
    },
  },
  {
    id: "d3", is_active: true, sort_order: 3,
    data: {
      category: "ইনস্ট্যান্ট ডেলিভারি ২৪/৭",
      title: "Activate in Minutes",
      subtitle: "অর্ডার করার সাথে সাথেই অ্যাক্টিভেশন — কোনো অপেক্ষা নেই।",
      color_preset: "emerald",
      cta: "শুরু করুন", link: "/products",
      secondary_cta: "ক্যাটাগরি দেখুন", secondary_link: "/categories",
    },
  },
];

const TRUST_BADGES = [
  { dot: "#34d399", label: "১০০% নিরাপদ" },
  { dot: "#60a5fa", label: "ইনস্ট্যান্ট ডেলিভারি" },
  { dot: "#f87171", label: "২৪/৭ সাপোর্ট" },
];

const BN = "'Hind Siliguri', system-ui, sans-serif";
const EN = "'Inter', system-ui, sans-serif";

export function ImageBannerCarousel() {
  const [rows, setRows] = useState<BannerRow[] | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

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
    if (slides.length < 2 || paused) return;
    const id = window.setInterval(next, 5500);
    return () => window.clearInterval(id);
  }, [next, slides.length, paused]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX.current = null;
  };

  return (
    <section className="px-3 sm:px-5 lg:px-8 pt-4 sm:pt-5 pb-3">
      <div
        className="relative mx-auto w-full max-w-[1480px] overflow-hidden rounded-[28px] sm:rounded-[36px] md:rounded-[40px] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/10 bg-[#050505] group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((s, idx) => {
          const d = s.data || {};
          const eyebrow = d.category || "";
          const title = d.title || "Rama Sub";
          const subtitle = d.subtitle || "";
          const cta = d.cta || "এখনই কিনুন";
          const link = d.link || "/products";
          const secCta = d.secondary_cta || "ক্যাটাগরি দেখুন";
          const secLink = d.secondary_link || "/categories";
          const p = PRESET[d.color_preset || "ruby"] || PRESET.ruby;
          const personSrc = d.image_url || personAsset.url;
          const isActive = idx === active;

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
              {/* Glossy base */}
              <div className="absolute inset-0" style={{ background: p.gradient }} />
              {/* Top-right ambient sweep */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: p.sweep }} />
              {/* Left soft white glow — lifts text without darkening */}
              <div
                className="absolute inset-0 pointer-events-none hidden md:block"
                style={{
                  background:
                    "radial-gradient(60% 80% at 20% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
                }}
              />
              {/* Mobile bottom soft white wash */}
              <div
                className="absolute inset-0 pointer-events-none md:hidden"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 40%, rgba(255,255,255,0.12) 100%)",
                }}
              />
              {/* Soft white vignette — brightens edges instead of darkening */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 50%, transparent 60%, rgba(255,255,255,0.08) 100%)",
                }}
              />
              {/* Diagonal gloss line */}
              <div
                className="absolute -top-1/2 -left-1/4 h-[200%] w-[55%] rotate-[28deg] blur-3xl pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)" }}
              />


              <div
                className="relative grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center"
                style={{
                  gap: "clamp(16px, 2vw, 32px)",
                  paddingLeft: "clamp(20px, 4vw, 80px)",
                  paddingRight: "clamp(20px, 4vw, 80px)",
                  paddingTop: "clamp(28px, 3.2vw, 56px)",
                  paddingBottom: "clamp(28px, 3.2vw, 56px)",
                  minHeight: "clamp(360px, 38vw, 560px)",
                }}
              >
                {/* LEFT */}
                <div className="order-2 md:order-1 min-w-0 text-center md:text-left flex flex-col items-center md:items-start gap-4 sm:gap-5 z-10">
                  {eyebrow && (
                    <span
                      className="inline-flex items-center px-4 py-1.5 rounded-full backdrop-blur-md"
                      style={{
                        fontFamily: BN,
                        wordBreak: "keep-all",
                        background: p.pillBg,
                        border: `1px solid ${p.pillBorder}`,
                      }}
                    >
                      <span
                        className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] uppercase"
                        style={{ color: p.accent }}
                      >
                        {eyebrow}
                      </span>
                    </span>
                  )}

                  <h2
                    className="font-black tracking-tight leading-[1.02] text-[40px] sm:text-[58px] md:text-[72px] lg:text-[84px]"
                    style={{
                      color: "#ffffff",
                      fontFamily: /[\u0980-\u09FF]/.test(title) ? BN : EN,
                      wordBreak: "keep-all",
                      letterSpacing: "-0.025em",
                      textShadow:
                        "0 0 24px rgba(255,255,255,0.45), 0 0 60px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.35)",
                    }}
                  >
                    {tail ? (
                      <>
                        <span style={{ color: "#ffffff" }}>{head}</span>{" "}
                        <span
                          style={{
                            color: p.accent,
                            textShadow: `0 0 28px rgba(255,255,255,0.55), 0 0 60px ${p.halo}`,
                          }}
                        >
                          {tail}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#ffffff" }}>{title}</span>
                    )}
                  </h2>

                  {subtitle && (
                    <p
                      className="text-sm sm:text-base md:text-lg max-w-lg mx-auto md:mx-0"
                      style={{
                        color: "rgba(255,255,255,0.96)",
                        fontFamily: BN,
                        wordBreak: "keep-all",
                        lineHeight: 1.65,
                        textShadow: "0 0 18px rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.3)",
                      }}
                    >
                      {subtitle}
                    </p>
                  )}

                  {/* Frosted glass pills */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5">
                    {TRUST_BADGES.map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                        style={{ fontFamily: BN, wordBreak: "keep-all" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.dot, boxShadow: `0 0 8px ${b.dot}` }} />
                        <span className="text-[11px] sm:text-xs text-white font-medium">
                          {b.label}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5 sm:gap-3 pt-1">
                    <Link
                      to={link as never}
                      className="inline-flex items-center justify-center rounded-2xl px-8 sm:px-10 py-3.5 text-sm sm:text-base font-bold text-white transition-all hover:translate-y-[-2px] active:translate-y-0"
                      style={{
                        fontFamily: BN,
                        background: `linear-gradient(135deg, ${p.accent}, color-mix(in oklab, ${p.accent} 60%, #000))`,
                        boxShadow: `0 12px 32px -8px ${p.halo}`,
                      }}
                    >
                      {cta}
                    </Link>
                    <Link
                      to={secLink as never}
                      className="inline-flex items-center justify-center rounded-2xl px-7 sm:px-9 py-3.5 text-sm sm:text-base font-semibold text-white bg-white/[0.06] border border-white/15 backdrop-blur-md hover:bg-white/[0.12] transition-all"
                      style={{ fontFamily: BN }}
                    >
                      {secCta}
                    </Link>
                  </div>
                </div>

                {/* RIGHT — person sits flush to bottom with white luminous halo */}
                <div className="order-1 md:order-2 relative flex items-end justify-center md:justify-end self-stretch min-h-[260px] md:min-h-[460px]">
                  {/* Outer white wash */}
                  <div
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[520px] h-[520px] md:w-[680px] md:h-[680px] rounded-full blur-[120px] pointer-events-none animate-pulse"
                    style={{ background: "rgba(255,255,255,0.35)", animationDuration: "6s" }}
                  />
                  {/* Mid color-tinted halo (still light) */}
                  <div
                    className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[340px] h-[340px] md:w-[440px] md:h-[440px] rounded-full blur-[80px] pointer-events-none"
                    style={{ background: p.halo2 }}
                  />
                  {/* Inner bright light disc behind subject */}
                  <div
                    className="absolute left-1/2 bottom-[4%] -translate-x-1/2 w-[240px] h-[240px] md:w-[320px] md:h-[320px] rounded-full pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 45%, transparent 75%)",
                    }}
                  />

                  {/* Person flush to bottom, white glow drop-shadow */}
                  <img
                    src={personSrc}
                    alt={title}
                    className="relative block h-[280px] sm:h-[360px] md:h-[490px] lg:h-[560px] w-auto object-contain select-none pointer-events-none -mb-14 sm:-mb-20 md:-mb-28"
                    style={{
                      filter:
                        "drop-shadow(0 0 26px rgba(255,255,255,0.55)) drop-shadow(0 0 70px rgba(255,255,255,0.30)) drop-shadow(0 18px 28px rgba(0,0,0,0.30))",
                    }}
                    draggable={false}
                    loading={idx === 0 ? "eager" : "lazy"}
                    width={900}
                    height={900}
                  />
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
              className="absolute left-2 sm:left-4 md:left-5 top-1/2 -translate-y-1/2 z-30 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/25 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)] transition flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 sm:right-4 md:right-5 top-1/2 -translate-y-1/2 z-30 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/25 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)] transition flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActive(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === active
                      ? "w-12 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                      : "w-1.5 bg-white/30 hover:bg-white/60"
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
