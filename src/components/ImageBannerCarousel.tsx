import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import banner1 from "@/assets/rama-banner-1.png.asset.json";
import banner2 from "@/assets/rama-banner-2.png.asset.json";
import banner3 from "@/assets/rama-banner-3.png.asset.json";

const BANNERS = [
  {
    id: 1,
    src: banner1.url,
    alt: "Rama Subscription — বিশ্বস্ততার আরেক নাম",
    to: "/products",
  },
  {
    id: 2,
    src: banner2.url,
    alt: "Rama Subscription — Premium Digital Subscriptions",
    to: "/products",
  },
  {
    id: 3,
    src: banner3.url,
    alt: "Rama Subscription — All Your Favorite Apps",
    to: "/products",
  },
];

export function ImageBannerCarousel() {
  const [active, setActive] = useState(0);

  const next = useCallback(() => setActive((i) => (i + 1) % BANNERS.length), []);
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
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl md:rounded-[28px] border border-white/20 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] group">
        {/* Slides */}
        <div className="relative aspect-[16/9] sm:aspect-[2/1] md:aspect-[2.5/1] lg:aspect-[3/1]">
          {BANNERS.map((banner, idx) => (
            <Link
              key={banner.id}
              to={banner.to as never}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                idx === active ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover object-center"
                loading={idx === 0 ? "eager" : "lazy"}
                width={1920}
                height={640}
              />
            </Link>
          ))}
        </div>

        {/* Previous */}
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
                  ? "w-6 bg-white shadow-sm"
                  : "w-2.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
