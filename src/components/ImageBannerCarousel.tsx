import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import personAsset from "@/assets/rama-person.png.asset.json";

/**
 * Simple, clean hero banner — light background, person photo on the left,
 * concise English headline + CTA on the right. No carousel, no chrome.
 */
export function ImageBannerCarousel() {
  return (
    <section className="px-4 md:px-10 pt-6 pb-4">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-2 items-end gap-4 sm:gap-6 px-5 sm:px-10 md:px-14 pt-8 sm:pt-10 md:pt-14 min-h-[220px] sm:min-h-[300px] md:min-h-[360px]">
          {/* Text */}
          <div className="min-w-0 pb-6 sm:pb-10 md:pb-14">
            <span className="inline-block text-[10px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-sky-600">
              Rama Sub · BD
            </span>
            <h2 className="mt-3 font-extrabold tracking-tight text-slate-900 text-[22px] leading-[1.1] sm:text-4xl md:text-5xl">
              Premium Subscriptions,{" "}
              <span className="text-sky-600">Simple Prices.</span>
            </h2>
            <p className="mt-3 text-slate-600 text-[13px] sm:text-base max-w-md">
              Netflix, ChatGPT, Canva, Zoom, Microsoft Office & more — instant
              delivery, trusted support.
            </p>
            <Link
              to="/products"
              className="mt-5 sm:mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 sm:px-6 py-2.5 sm:py-3 text-white text-sm font-semibold shadow-md hover:bg-slate-800 transition"
            >
              Shop Now
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
              loading="eager"
              width={800}
              height={800}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
