import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import personAsset from "@/assets/rama-person.png.asset.json";

type Banner = {
  id: number;
  eyebrow: string;
  title: React.ReactNode;
  desc: string;
  cta: string;
  to: string;
  bg: string; // tailwind gradient classes
  accent: string; // tailwind text color for accent word
  eyebrowColor: string;
};

const BANNERS: Banner[] = [
  {
    id: 1,
    eyebrow: "Rama Sub · BD",
    title: (
      <>
        Premium Subscriptions,{" "}
        <span className="text-sky-600">Simple Prices.</span>
      </>
    ),
    desc: "Netflix, ChatGPT, Canva, Zoom & more — instant delivery, trusted support.",
    cta: "Shop Now",
    to: "/products",
    bg: "from-slate-50 via-white to-sky-50",
    accent: "text-sky-600",
    eyebrowColor: "text-sky-600",
  },
  {
    id: 2,
    eyebrow: "Trusted by 10,000+ Customers",
    title: (
      <>
        All Your Favorite Apps,{" "}
        <span className="text-amber-600">One Place.</span>
      </>
    ),
    desc: "Official, secure and renewable subscriptions at the best price in Bangladesh.",
    cta: "Explore Products",
    to: "/products",
    bg: "from-amber-50 via-white to-slate-50",
    accent: "text-amber-600",
    eyebrowColor: "text-amber-600",
  },
  {
    id: 3,
    eyebrow: "24/7 Live Support",
    title: (
      <>
        Activate in Minutes.{" "}
        <span className="text-emerald-600">Stream in Seconds.</span>
      </>
    ),
    desc: "Fast checkout, instant delivery and friendly help whenever you need it.",
    cta: "Get Started",
    to: "/products",
    bg: "from-emerald-50 via-white to-slate-50",
    accent: "text-emerald-600",
    eyebrowColor: "text-emerald-600",
  },
];

/**
 * Premium-yet-simple hero banner carousel — light backgrounds, the person
 * photo on the right, an English headline + CTA on the left. 3 slides, auto
 * advance, with subtle nav and dots.
 */
export function ImageBannerCarousel() {
  const [active, setActive] = useState(0);

  const next = useCallback(
    () => setActive((i) => (i + 1) % BANNERS.length),
    [],
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + BANNERS.length) % BANNERS.length),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(next, 6000);
    return () => window.clearInterval(id);
  }, [next]);

  return (
    <section className="px-4 md:px-10 pt-6 pb-4">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)] group">
        {/* Slides */}
        <div className="relative">
          {BANNERS.map((b, idx) => (
            <div
              key={b.id}
              className={`${
                idx === active
                  ? "relative opacity-100 z-10"
                  : "absolute inset-0 opacity-0 z-0 pointer-events-none"
              } transition-opacity duration-700 ease-out bg-gradient-to-br ${b.bg}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-2 items-end gap-4 sm:gap-6 px-5 sm:px-10 md:px-14 pt-8 sm:pt-10 md:pt-14 min-h-[220px] sm:min-h-[300px] md:min-h-[360px]">
                {/* Text */}
                <div className="min-w-0 pb-6 sm:pb-10 md:pb-14">
                  <span
                    className={`inline-block text-[10px] sm:text-xs font-semibold tracking-[0.22em] uppercase ${b.eyebrowColor}`}
                  >
                    {b.eyebrow}
                  </span>
                  <h2 className="mt-3 font-extrabold tracking-tight text-slate-900 text-[22px] leading-[1.1] sm:text-4xl md:text-5xl">
                    {b.title}
                  </h2>
                  <p className="mt-3 text-slate-600 text-[13px] sm:text-base max-w-md">
                    {b.desc}
                  </p>
                  <Link
                    to={b.to as never}
                    className="mt-5 sm:mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 sm:px-6 py-2.5 sm:py-3 text-white text-sm font-semibold shadow-md hover:bg-slate-800 transition"
                  >
                    {b.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Person */}
                <div className="relative h-full flex items-end justify-end shrink-0">
                  <img
                    src={personAsset.url}
                    alt="Rama Sub representative"
                    className="block h-[200px] sm:h-[300px] md:h-[380px] w-auto object-contain object-bottom drop-shadow-[0_18px_30px_rgba(15,23,42,0.18)] select-none pointer-events-none"
                    draggable={false}
                    loading={idx === 0 ? "eager" : "lazy"}
                    width={800}
                    height={800}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prev */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous banner"
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/85 backdrop-blur-md text-slate-800 shadow-md hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={next}
          aria-label="Next banner"
          className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/85 backdrop-blur-md text-slate-800 shadow-md hover:bg-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Go to banner ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === active
                  ? "w-6 bg-slate-900 shadow-sm"
                  : "w-2.5 bg-slate-900/30 hover:bg-slate-900/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
