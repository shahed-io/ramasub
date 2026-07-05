import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminNotFound,
  head: () => ({
    meta: [
      { title: "404 — Page Not Found" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminNotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-white px-4 py-10 font-serif">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_10px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-slate-100 px-6 py-12 sm:px-12 sm:py-16 text-center">
        {/* 404 heading */}
        <div className="text-[72px] sm:text-[96px] leading-none font-normal text-slate-900 tracking-tight" style={{ fontFamily: "'Arvo', Georgia, serif" }}>
          404
        </div>

        {/* Illustration */}
        <div className="mt-2 mx-auto w-full max-w-md">
          <LostCavemanIllustration />
        </div>

        {/* Text */}
        <h1 className="mt-6 text-2xl sm:text-3xl text-slate-900" style={{ fontFamily: "'Arvo', Georgia, serif" }}>
          Look like you're lost
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          the page you are looking for not avaible!
        </p>

        {/* Button */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center h-11 px-8 rounded-md bg-[#39ac31] hover:bg-[#329429] text-white font-medium text-sm shadow-sm transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function LostCavemanIllustration() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Ground line */}
      <line x1="20" y1="180" x2="380" y2="180" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="3 4" />

      {/* Left rock */}
      <ellipse cx="70" cy="180" rx="42" ry="10" fill="#f1f3f5" />
      <path d="M 40 178 Q 45 130, 70 118 Q 95 128, 100 178 Z" fill="#d9dde2" />
      <path d="M 55 178 Q 60 145, 72 138 Q 84 148, 88 178 Z" fill="#c6ccd4" />

      {/* Right rock (bigger) */}
      <ellipse cx="330" cy="180" rx="55" ry="12" fill="#f1f3f5" />
      <path d="M 285 178 Q 292 110, 330 92 Q 368 108, 375 178 Z" fill="#d9dde2" />
      <path d="M 300 178 Q 310 128, 330 116 Q 350 130, 358 178 Z" fill="#c6ccd4" />

      {/* Bushes */}
      <ellipse cx="130" cy="178" rx="18" ry="7" fill="#4ade80" />
      <ellipse cx="128" cy="172" rx="12" ry="8" fill="#22c55e" />
      <ellipse cx="270" cy="178" rx="22" ry="8" fill="#4ade80" />
      <ellipse cx="272" cy="171" rx="15" ry="9" fill="#22c55e" />

      {/* Caveman */}
      <g transform="translate(175, 90)">
        {/* Legs */}
        <rect x="15" y="70" width="9" height="20" rx="3" fill="#e8b48e" />
        <rect x="30" y="70" width="9" height="20" rx="3" fill="#e8b48e" />
        {/* Feet */}
        <ellipse cx="19" cy="90" rx="7" ry="3" fill="#3f2a1d" />
        <ellipse cx="34" cy="90" rx="7" ry="3" fill="#3f2a1d" />
        {/* Tunic (orange with spots) */}
        <path d="M 6 40 Q 27 35, 48 40 L 44 72 Q 27 76, 10 72 Z" fill="#f59e0b" />
        <circle cx="18" cy="52" r="2.5" fill="#b45309" />
        <circle cx="30" cy="58" r="2" fill="#b45309" />
        <circle cx="38" cy="48" r="2.2" fill="#b45309" />
        <circle cx="24" cy="65" r="1.8" fill="#b45309" />
        {/* Arms */}
        <path d="M 6 42 Q -4 55, 4 68" stroke="#e8b48e" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M 48 42 Q 60 52, 58 66" stroke="#e8b48e" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Head */}
        <circle cx="27" cy="22" r="16" fill="#e8b48e" />
        {/* Hair */}
        <path d="M 11 18 Q 15 4, 27 4 Q 40 4, 44 18 Q 42 12, 35 12 Q 30 8, 24 10 Q 18 10, 15 15 Z" fill="#3f2a1d" />
        {/* Beard */}
        <path d="M 15 26 Q 20 42, 27 40 Q 34 42, 39 26 Q 38 34, 30 36 Q 22 34, 15 26 Z" fill="#3f2a1d" />
        {/* Eyes */}
        <circle cx="22" cy="22" r="1.5" fill="#1f2937" />
        <circle cx="32" cy="22" r="1.5" fill="#1f2937" />
        {/* Cord/rope from hand */}
        <path d="M 4 68 Q -10 90, 20 95 Q 55 100, 58 66" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Broken plug end */}
        <rect x="-14" y="88" width="6" height="4" fill="#1f2937" />
      </g>
    </svg>
  );
}
