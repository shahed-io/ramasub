import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import personAsset from "@/assets/rama-person.png.asset.json";

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

// Gradient map for color_preset → tailwind gradient classes
const PRESET_GRADIENT: Record<string, string> = {
  ruby: "from-[#7a0d10] via-[#b40d12] to-[#5a0a0d]",
  spotify: "from-[#063b22] via-[#0e7a3d] to-[#04200f]",
  canva: "from-[#1f2a8c] via-[#4f3fbd] to-[#0e1442]",
  eid: "from-[#7a0a3a] via-[#c2185b] to-[#3a0716]",
  ocean: "from-[#0b1f4a] via-[#11357a] to-[#070f2a]",
  violet: "from-[#3a0d6b] via-[#6d28d9] to-[#1a0833]",
  emerald: "from-[#053a2c] via-[#0e8c5b] to-[#02211a]",
  graphite: "from-[#1a1d24] via-[#2c313b] to-[#0a0c10]",
  indigo: "from-[#1e1b6b] via-[#3730a3] to-[#0a0a3a]",
  sunset: "from-[#7a2206] via-[#e2540e] to-[#3a0f02]",
};

const DEFAULT_SLIDES: BannerRow[] = [
  {
    id: "d1",
    is_active: true,
    sort_order: 1,
    data: {
      category: "বিশ্বস্ততার আরেক নাম",
      title: "RAMA SUBSCRIPTION",
      color_preset: "ruby",
      cta: "Shop Now",
      link: "/products",
    },
  },
  {
    id: "d2",
    is_active: true,
    sort_order: 2,
    data: {
      category: "সকল প্রিমিয়াম সাবস্ক্রিপশন",
      title: "ONE TRUSTED STORE",
      color_preset: "ocean",
      cta: "Explore",
      link: "/products",
    },
  },
  {
    id: "d3",
    is_active: true,
    sort_order: 3,
    data: {
      category: "ইনস্ট্যান্ট ডেলিভারি ২৪/৭",
      title: "ACTIVATE IN MINUTES",
      color_preset: "emerald",
      cta: "Get Started",
      link: "/products",
    },
  },
];

const FEATURED = [
  { name: "CapCut", domain: "capcut.com" },
  { name: "Creative Cloud", domain: "adobe.com" },
  { name: "ChatGPT", domain: "openai.com" },
];

const BRANDS = [
  { name: "Canva", domain: "canva.com" },
  { name: "Zoom", domain: "zoom.us" },
  { name: "Freepik", domain: "freepik.com" },
  { name: "Envato", domain: "envato.com" },
  { name: "Filmora", domain: "filmora.wondershare.com" },
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "YouTube", domain: "youtube.com" },
  { name: "Netflix", domain: "netflix.com" },
  { name: "ElevenLabs", domain: "elevenlabs.io" },
  { name: "Duolingo", domain: "duolingo.com" },
  { name: "Coursera", domain: "coursera.org" },
  { name: "Prime", domain: "primevideo.com" },
  { name: "Google Meet", domain: "meet.google.com" },
  { name: "Drive", domain: "drive.google.com" },
];

function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

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

  // Reset active when slide count changes
  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  return (
    <section className="px-4 md:px-10 pt-6 pb-4">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] group">
        {slides.map((s, idx) => {
          const d = s.data || {};
          const eyebrow = d.category || "";
          const title = d.title || "RAMA SUBSCRIPTION";
          const cta = d.cta || "Shop Now";
          const link = d.link || "/products";
          const gradient =
            PRESET_GRADIENT[d.color_preset || "ruby"] || PRESET_GRADIENT.ruby;
          const customBg = d.bg_color
            ? { background: d.bg_color }
            : undefined;
          const personSrc = d.image_url || personAsset.url;

          return (
            <div
              key={s.id}
              className={`${
                idx === active
                  ? "relative opacity-100 z-10"
                  : "absolute inset-0 opacity-0 z-0 pointer-events-none"
              } transition-opacity duration-700 ease-out ${
                customBg ? "" : `bg-gradient-to-br ${gradient}`
              }`}
              style={customBg}
            >
              <Sparkles />

              <div className="relative grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] items-end gap-2 sm:gap-6 px-3 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-10 min-h-[260px] sm:min-h-[340px] md:min-h-[400px]">
                <div className="relative h-full flex items-end justify-start">
                  <img
                    src={personSrc}
                    alt={title}
                    className="block h-[200px] sm:h-[300px] md:h-[380px] w-auto object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)] select-none pointer-events-none"
                    draggable={false}
                    loading={idx === 0 ? "eager" : "lazy"}
                    width={800}
                    height={800}
                  />
                </div>

                <div className="min-w-0 pb-5 sm:pb-8 md:pb-10 flex flex-col items-center text-center">
                  {eyebrow && (
                    <span
                      className="text-white/95 text-sm sm:text-xl md:text-2xl leading-tight"
                      style={{
                        fontFamily: "'Hind Siliguri', system-ui, sans-serif",
                        wordBreak: "keep-all",
                      }}
                    >
                      {eyebrow}
                    </span>
                  )}
                  <h2
                    className="mt-1 sm:mt-2 font-extrabold tracking-wide text-white text-[18px] leading-[1.05] sm:text-3xl md:text-[42px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                    style={{
                      fontFamily: "'Poppins', 'Hind Siliguri', system-ui, sans-serif",
                      letterSpacing: "0.02em",
                      wordBreak: "keep-all",
                    }}
                  >
                    {title}
                  </h2>
                  {d.subtitle && (
                    <p
                      className="mt-2 text-white/90 text-xs sm:text-sm max-w-md"
                      style={{
                        fontFamily: "'Hind Siliguri', system-ui, sans-serif",
                        wordBreak: "keep-all",
                      }}
                    >
                      {d.subtitle}
                    </p>
                  )}

                  <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full max-w-[520px]">
                    {FEATURED.map((b) => (
                      <BrandTile key={b.name} name={b.name} domain={b.domain} big />
                    ))}
                  </div>

                  <div className="mt-1.5 sm:mt-2 grid grid-cols-7 gap-1 sm:gap-1.5 w-full max-w-[620px]">
                    {BRANDS.map((b) => (
                      <BrandTile key={b.name} name={b.name} domain={b.domain} />
                    ))}
                  </div>

                  <Link
                    to={link as never}
                    className="mt-3 sm:mt-4 inline-flex items-center justify-center rounded-full bg-white text-slate-900 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-white/90 transition"
                  >
                    {cta}
                  </Link>
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
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/90 text-slate-800 shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>

            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActive(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === active ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
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

function BrandTile({
  name,
  domain,
  big = false,
}: {
  name: string;
  domain: string;
  big?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-white shadow-sm ${
        big ? "py-2 sm:py-2.5 px-2" : "py-1 sm:py-1.5 px-1"
      }`}
      title={name}
    >
      <img
        src={favicon(domain)}
        alt=""
        className={big ? "h-5 w-5 sm:h-6 sm:w-6" : "h-3.5 w-3.5 sm:h-4 sm:w-4"}
        loading="lazy"
        width={big ? 24 : 16}
        height={big ? 24 : 16}
      />
      <span
        className={`font-semibold text-slate-800 truncate ${
          big ? "text-xs sm:text-base" : "text-[8px] sm:text-[10px]"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function Sparkles() {
  const dots = [
    { top: "8%", left: "18%", size: 14 },
    { top: "22%", left: "6%", size: 10 },
    { top: "62%", left: "3%", size: 12 },
    { top: "10%", right: "8%", size: 16 },
    { top: "40%", right: "4%", size: 10 },
    { top: "75%", right: "12%", size: 12 },
    { top: "5%", left: "48%", size: 9 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {dots.map((d, i) => (
        <svg
          key={i}
          width={d.size}
          height={d.size}
          viewBox="0 0 24 24"
          className="absolute text-white/70"
          style={{ top: d.top, left: d.left, right: d.right }}
          fill="currentColor"
        >
          <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z" />
        </svg>
      ))}
    </div>
  );
}
