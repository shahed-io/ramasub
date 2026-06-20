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

// Rich radial-mesh backgrounds per preset
const PRESET_BG: Record<string, string> = {
  ruby:
    "radial-gradient(120% 90% at 15% 20%, #c81a1f 0%, #7a0d10 45%, #3d0608 100%)",
  spotify:
    "radial-gradient(120% 90% at 15% 20%, #1ed760 0%, #0e7a3d 45%, #04200f 100%)",
  canva:
    "radial-gradient(120% 90% at 15% 20%, #6d5cff 0%, #2a1f9c 45%, #0e1442 100%)",
  eid:
    "radial-gradient(120% 90% at 15% 20%, #e8407a 0%, #7a0a3a 45%, #2a0510 100%)",
  ocean:
    "radial-gradient(120% 90% at 15% 20%, #2b6ad1 0%, #0b1f4a 45%, #060e2a 100%)",
  violet:
    "radial-gradient(120% 90% at 15% 20%, #8b5cf6 0%, #4c1d95 45%, #1a0833 100%)",
  emerald:
    "radial-gradient(120% 90% at 15% 20%, #10b981 0%, #064e3b 45%, #02211a 100%)",
  graphite:
    "radial-gradient(120% 90% at 15% 20%, #4b5563 0%, #1f2937 45%, #0a0c10 100%)",
  indigo:
    "radial-gradient(120% 90% at 15% 20%, #6366f1 0%, #1e1b6b 45%, #0a0a3a 100%)",
  sunset:
    "radial-gradient(120% 90% at 15% 20%, #f59e0b 0%, #c2410c 45%, #3a0f02 100%)",
};

const DEFAULT_SLIDES: BannerRow[] = [
  {
    id: "d1",
    is_active: true,
    sort_order: 1,
    data: {
      category: "বিশ্বস্ততার আরেক নাম",
      title: "Rama Subscription",
      subtitle: "প্রিমিয়াম সাবস্ক্রিপশন এখন হাতের মুঠোয় — ১০০% নিরাপদ, ২৪/৭ সাপোর্ট।",
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
  { icon: ShieldCheck, label: "১০০% নিরাপদ" },
  { icon: Zap, label: "ইনস্ট্যান্ট ডেলিভারি" },
  { icon: Headphones, label: "২৪/৭ সাপোর্ট" },
];

export function ImageBannerCarousel() {
  const [rows, setRows] = useState<BannerRow[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;
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
    return () => {
      mounted = false;
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
    <section className="px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-4">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl sm:rounded-3xl shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] group ring-1 ring-black/5">
        {slides.map((s, idx) => {
          const d = s.data || {};
          const eyebrow = d.category || "";
          const title = d.title || "Rama Subscription";
          const subtitle = d.subtitle || "";
          const cta = d.cta || "এখনই কিনুন";
          const link = d.link || "/products";
          const bg = d.bg_color
            ? d.bg_color
            : PRESET_BG[d.color_preset || "ruby"] || PRESET_BG.ruby;
          const personSrc = d.image_url || personAsset.url;

          return (
            <div
              key={s.id}
              className={`${
                idx === active
                  ? "relative opacity-100 z-10"
                  : "absolute inset-0 opacity-0 z-0 pointer-events-none"
              } transition-opacity duration-700 ease-out`}
              style={{ background: bg }}
              aria-hidden={idx === active ? undefined : true}
            >
              {/* Soft glow blobs */}
              <div
                className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
              <div
                className="absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />

              <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-3 sm:gap-6 px-4 sm:px-8 md:px-12 py-5 sm:py-8 md:py-10 min-h-[300px] sm:min-h-[380px] md:min-h-[440px]">
                {/* Text panel — order on mobile keeps image first */}
                <div className="order-2 md:order-1 min-w-0 text-center md:text-left">
                  {eyebrow && (
                    <span
                      className="inline-block text-white/90 text-xs sm:text-sm md:text-base px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/15"
                      style={{
                        fontFamily: "'Hind Siliguri', system-ui, sans-serif",
                        wordBreak: "keep-all",
                      }}
                    >
                      {eyebrow}
                    </span>
                  )}

                  <h2
                    className="mt-3 sm:mt-4 font-extrabold text-white leading-[1.05] text-[26px] sm:text-[38px] md:text-[52px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                    style={{
                      fontFamily:
                        "'Poppins', 'Hind Siliguri', system-ui, sans-serif",
                      letterSpacing: "-0.01em",
                      wordBreak: "keep-all",
                    }}
                  >
                    {title}
                  </h2>

                  {subtitle && (
                    <p
                      className="mt-2 sm:mt-3 text-white/85 text-sm sm:text-base md:text-lg max-w-xl mx-auto md:mx-0"
                      style={{
                        fontFamily: "'Hind Siliguri', system-ui, sans-serif",
                        wordBreak: "keep-all",
                        lineHeight: 1.55,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}

                  <div className="mt-4 sm:mt-5 flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5">
                    {TRUST_BADGES.map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 text-white/95 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/15"
                        style={{ fontFamily: "'Hind Siliguri', system-ui, sans-serif" }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 sm:mt-6 flex flex-wrap justify-center md:justify-start gap-2.5">
                    <Link
                      to={link as never}
                      className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 px-6 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition"
                      style={{ fontFamily: "'Hind Siliguri', system-ui, sans-serif" }}
                    >
                      {cta}
                    </Link>
                    <Link
                      to="/categories"
                      className="inline-flex items-center justify-center rounded-full bg-white/10 text-white px-6 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold ring-1 ring-white/25 hover:bg-white/20 transition"
                      style={{ fontFamily: "'Hind Siliguri', system-ui, sans-serif" }}
                    >
                      ক্যাটাগরি দেখুন
                    </Link>
                  </div>
                </div>

                {/* Image panel */}
                <div className="order-1 md:order-2 relative flex items-end justify-center md:justify-end">
                  <div className="relative">
                    <div
                      className="absolute inset-0 -m-6 rounded-full opacity-40 blur-2xl"
                      style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 65%)" }}
                    />
                    <img
                      src={personSrc}
                      alt={title}
                      className="relative block h-[200px] sm:h-[300px] md:h-[400px] w-auto object-contain drop-shadow-[0_22px_36px_rgba(0,0,0,0.45)] select-none pointer-events-none"
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
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>

            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActive(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === active ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
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
