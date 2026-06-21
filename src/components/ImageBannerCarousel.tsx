import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import personAsset from "@/assets/rama-person-new.png.asset.json";

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

// Premium glossy palettes — each slide gets a distinct mood.
const PRESET: Record<
  string,
  { gradient: string; sweep: string; halo: string; halo2: string; accent: string; pillBg: string; pillBorder: string }
> = {
  ruby: {
    gradient: "linear-gradient(135deg, #3d0a0a 0%, #1a0505 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(244,63,94,0.22), transparent 60%)",
    halo: "rgba(225,29,72,0.35)",
    halo2: "rgba(244,63,94,0.22)",
    accent: "#f43f5e",
    pillBg: "rgba(244,63,94,0.10)",
    pillBorder: "rgba(244,63,94,0.30)",
  },
  sapphire: {
    gradient: "linear-gradient(135deg, #0b1a3d 0%, #050a1f 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(56,189,248,0.20), transparent 60%)",
    halo: "rgba(59,130,246,0.35)",
    halo2: "rgba(99,102,241,0.22)",
    accent: "#60a5fa",
    pillBg: "rgba(59,130,246,0.10)",
    pillBorder: "rgba(96,165,250,0.30)",
  },
  emerald: {
    gradient: "linear-gradient(135deg, #06302a 0%, #02110f 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(16,185,129,0.20), transparent 60%)",
    halo: "rgba(16,185,129,0.32)",
    halo2: "rgba(52,211,153,0.22)",
    accent: "#34d399",
    pillBg: "rgba(16,185,129,0.10)",
    pillBorder: "rgba(52,211,153,0.30)",
  },
  // legacy fallbacks
  ocean: {
    gradient: "linear-gradient(135deg, #0b1a3d 0%, #050a1f 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(56,189,248,0.20), transparent 60%)",
    halo: "rgba(59,130,246,0.35)", halo2: "rgba(99,102,241,0.22)", accent: "#60a5fa",
    pillBg: "rgba(59,130,246,0.10)", pillBorder: "rgba(96,165,250,0.30)",
  },
  violet: {
    gradient: "linear-gradient(135deg, #2a1065 0%, #14072e 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(167,139,250,0.22), transparent 60%)",
    halo: "rgba(139,92,246,0.35)", halo2: "rgba(167,139,250,0.22)", accent: "#a78bfa",
    pillBg: "rgba(139,92,246,0.12)", pillBorder: "rgba(167,139,250,0.30)",
  },
  sunset: {
    gradient: "linear-gradient(135deg, #4a1f02 0%, #1a0a01 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(251,191,36,0.22), transparent 60%)",
    halo: "rgba(245,158,11,0.32)", halo2: "rgba(251,191,36,0.22)", accent: "#fbbf24",
    pillBg: "rgba(245,158,11,0.10)", pillBorder: "rgba(251,191,36,0.30)",
  },
  graphite: {
    gradient: "linear-gradient(135deg, #1f2937 0%, #0b0e14 55%, #000000 100%)",
    sweep: "radial-gradient(80% 60% at 78% 22%, rgba(148,163,184,0.18), transparent 60%)",
    halo: "rgba(148,163,184,0.25)", halo2: "rgba(71,85,105,0.20)", accent: "#cbd5e1",
    pillBg: "rgba(148,163,184,0.10)", pillBorder: "rgba(203,213,225,0.25)",
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
        className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] sm:rounded-[36px] md:rounded-[40px] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/10 bg-[#050505] group"
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
              {/* Diagonal gloss line */}
              <div
                className="absolute -top-1/2 -left-1/4 h-[200%] w-[55%] rotate-[28deg] blur-3xl pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent)" }}
              />

              <div className="relative grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center gap-4 sm:gap-6 px-5 sm:px-10 md:px-14 lg:px-20 py-7 sm:py-9 md:py-12 min-h-[360px] sm:min-h-[400px] md:min-h-[460px]">
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
                    className="text-white font-black tracking-tight leading-[1.02] text-[40px] sm:text-[58px] md:text-[72px] lg:text-[84px] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
                    style={{
                      fontFamily: /[\u0980-\u09FF]/.test(title) ? BN : EN,
                      wordBreak: "keep-all",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {tail ? (
                      <>
                        {head}{" "}
                        <span
                          style={{
                            color: p.accent,
                            textShadow: `0 0 32px ${p.halo}`,
                          }}
                        >
                          {tail}
                        </span>
                      </>
                    ) : (
                      title
                    )}
                  </h2>

                  {subtitle && (
                    <p
                      className="text-white/85 text-sm sm:text-base md:text-lg max-w-lg mx-auto md:mx-0"
                      style={{ fontFamily: BN, wordBreak: "keep-all", lineHeight: 1.65 }}
                    >
                      {subtitle}
                    </p>
                  )}

                  {/* Frosted glass pills */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5">
                    {TRUST_BADGES.map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        style={{ fontFamily: BN, wordBreak: "keep-all" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.dot, boxShadow: `0 0 8px ${b.dot}` }} />
                        <span className="text-[11px] sm:text-xs text-white/90 font-medium">
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

                {/* RIGHT — person with radiant halo */}
                <div className="order-1 md:order-2 relative flex items-end justify-center md:justify-end self-stretch min-h-[220px] md:min-h-[420px]">
                  {/* Large soft halo */}
                  <div
                    className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[420px] h-[420px] md:w-[520px] md:h-[520px] rounded-full blur-[110px] pointer-events-none animate-pulse"
                    style={{ background: p.halo, animationDuration: "5s" }}
                  />
                  <div
                    className="absolute left-1/2 bottom-[15%] -translate-x-1/2 w-[260px] h-[260px] md:w-[340px] md:h-[340px] rounded-full blur-[70px] pointer-events-none"
                    style={{ background: p.halo2 }}
                  />
                  {/* Inner light disc behind subject */}
                  <div
                    className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-[200px] h-[200px] md:w-[280px] md:h-[280px] rounded-full pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)`,
                    }}
                  />

                  <img
                    src={personSrc}
                    alt={title}
                    className="relative block h-[240px] sm:h-[320px] md:h-[420px] lg:h-[480px] w-auto object-contain select-none pointer-events-none drop-shadow-[0_30px_50px_rgba(0,0,0,0.65)]"
                    style={{ maskImage: "linear-gradient(to bottom, black 92%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 92%, transparent 100%)" }}
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
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-white hover:bg-white/[0.18] transition flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-white hover:bg-white/[0.18] transition flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
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
