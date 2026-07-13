import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Sparkles, Copy, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------------------------------- */
/*  Multi-color highlighter                                                    */
/* -------------------------------------------------------------------------- */
const HIGHLIGHTS: Array<{ pattern: RegExp; className: string }> = [
  {
    pattern: /(বিশ্বস্ত|ভেরিফাইড|নিরাপদ|অরিজিনাল|গ্যারান্টি|Verified|Trusted|Premium)/g,
    className: "font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent",
  },
  {
    pattern: /(ডিজিটাল মার্কেটপ্লেস|মার্কেটপ্লেস|সাবস্ক্রিপশন|সফটওয়্যার|লাইসেন্স|AI টুলস|AI Tools|Streaming|Marketplace)/g,
    className: "font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent",
  },
  {
    pattern: /(24\/7|২৪\/৭|লাইভ সাপোর্ট|Live Support|সাপোর্ট)/g,
    className: "font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent",
  },
  {
    pattern: /(এক ক্লিকেই|এক ক্লিকে|ইনস্ট্যান্ট|Instant|মুহূর্তেই|দ্রুত|ডিজিটাল প্রয়োজন|প্রয়োজন)/g,
    className: "font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent",
  },
];

function colorizeMessage(text: string): ReactNode[] {
  const combined = new RegExp("(" + HIGHLIGHTS.map((h) => h.pattern.source).join("|") + ")", "g");
  const parts = text.split(combined).filter((p) => p !== undefined);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    const hit = HIGHLIGHTS.find((h) => new RegExp("^(?:" + h.pattern.source + ")$").test(part));
    if (hit) out.push(<span key={i} className={hit.className}>{part}</span>);
    else out.push(<span key={i}>{part}</span>);
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Types & storage                                                            */
/* -------------------------------------------------------------------------- */
type Frequency = "session" | "day" | "always";
type Theme = "gradient" | "light" | "dark";

type PopupData = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  message?: string;
  discount_text?: string;
  coupon_code?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  expires_at?: string;
  delay_seconds?: number;
  frequency?: Frequency;
  theme?: Theme;
};

const SESSION_KEY = "welcome_popup_dismissed_v2";
const DAY_KEY = "welcome_popup_dismissed_day_v2";

function shouldSkip(freq: Frequency): boolean {
  try {
    if (freq === "always") return false;
    if (freq === "session") return !!sessionStorage.getItem(SESSION_KEY);
    if (freq === "day") {
      const raw = localStorage.getItem(DAY_KEY);
      if (!raw) return false;
      const last = Number(raw);
      return Number.isFinite(last) && Date.now() - last < 24 * 60 * 60 * 1000;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function markDismissed(freq: Frequency) {
  try {
    if (freq === "session") sessionStorage.setItem(SESSION_KEY, "1");
    else if (freq === "day") localStorage.setItem(DAY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/*  Countdown                                                                  */
/* -------------------------------------------------------------------------- */
function useCountdown(expiresAt?: string) {
  const target = useMemo(() => {
    if (!expiresAt) return null;
    const t = new Date(expiresAt).getTime();
    return Number.isFinite(t) ? t : null;
  }, [expiresAt]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target || now === null) return null;
  const diff = Math.max(0, target - now);
  if (diff === 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s, expired: false };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */
export function WelcomePopup() {
  const [data, setData] = useState<PopupData | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from("admin_records")
          .select("data")
          .eq("kind", "welcome_popup")
          .eq("is_active", true)
          .order("sort_order")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const d = (row?.data as PopupData) || null;
        if (!d || d.enabled === false) return;
        if (!d.image_url && !d.title && !d.message && !d.discount_text) return;
        const freq: Frequency = (d.frequency as Frequency) || "session";
        if (shouldSkip(freq)) return;
        setData(d);
        const delay = Math.max(0, (d.delay_seconds ?? 1.5) * 1000);
        setTimeout(() => !cancelled && setOpen(true), delay);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countdown = useCountdown(data?.expires_at);

  const close = () => {
    setOpen(false);
    markDismissed((data?.frequency as Frequency) || "session");
  };

  const copyCode = async () => {
    if (!data?.coupon_code) return;
    try {
      await navigator.clipboard.writeText(data.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (!open || !data) return null;

  const theme: Theme = data.theme || "gradient";
  const hasImage = !!data.image_url;

  /* ------------------------------------------------------------------------ */
  /*  Theme styles                                                             */
  /* ------------------------------------------------------------------------ */
  const themeStyles = {
    gradient: {
      shell: "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 text-white",
      text: "text-white",
      subText: "text-white/85",
      chip: "bg-white/20 ring-1 ring-white/30 text-white",
      primaryBtn:
        "bg-white text-slate-900 hover:bg-white/95 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)]",
      secondaryBtn: "text-white/80 hover:text-white",
      couponBox: "bg-white/15 ring-1 ring-white/30 text-white",
      countdownBox: "bg-black/25 ring-1 ring-white/20",
      countdownNum: "text-white",
    },
    light: {
      shell: "bg-white text-slate-900",
      text: "text-slate-900",
      subText: "text-slate-600",
      chip: "bg-violet-50 ring-1 ring-violet-200 text-violet-700",
      primaryBtn:
        "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:opacity-95 shadow-[0_10px_24px_-10px_rgba(139,92,246,0.7)]",
      secondaryBtn: "text-slate-500 hover:text-slate-800",
      couponBox: "bg-slate-50 ring-1 ring-slate-200 text-slate-900",
      countdownBox: "bg-slate-100 ring-1 ring-slate-200",
      countdownNum: "text-slate-900",
    },
    dark: {
      shell: "bg-slate-950 text-white ring-1 ring-white/10",
      text: "text-white",
      subText: "text-slate-300",
      chip: "bg-white/10 ring-1 ring-white/20 text-white",
      primaryBtn:
        "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-95 shadow-[0_10px_24px_-10px_rgba(139,92,246,0.7)]",
      secondaryBtn: "text-slate-400 hover:text-white",
      couponBox: "bg-white/5 ring-1 ring-white/15 text-white",
      countdownBox: "bg-white/5 ring-1 ring-white/10",
      countdownNum: "text-white",
    },
  }[theme];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      onClick={close}
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_40px_100px_-25px_rgba(15,23,42,0.7)] ring-1 ring-white/20 ${themeStyles.shell} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow blobs — decorative */}
        {theme === "gradient" && (
          <>
            <div className="pointer-events-none absolute -top-24 -left-16 w-56 h-56 rounded-full bg-white/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-fuchsia-300/40 blur-3xl" />
          </>
        )}

        {/* Close */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur grid place-items-center text-slate-700 hover:bg-white shadow-md ring-1 ring-white/50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        {hasImage && (
          <a
            href={data.cta_link || "#"}
            onClick={(e) => {
              if (!data.cta_link) e.preventDefault();
            }}
            className="block relative"
          >
            <img
              src={data.image_url}
              alt={data.title || "Promotion"}
              className="w-full h-auto max-h-[280px] object-cover block"
              loading="eager"
            />
            {data.discount_text && (
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-extrabold tracking-wide shadow-[0_10px_24px_-8px_rgba(244,63,94,0.7)] ring-2 ring-white/40">
                {data.discount_text}
              </div>
            )}
          </a>
        )}

        {/* Body */}
        <div className="relative z-10 p-6 text-center">
          {data.badge && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${themeStyles.chip} mb-3`}>
              <Sparkles className="w-3.5 h-3.5" />
              {data.badge}
            </div>
          )}

          {data.title && (
            <h2
              id="welcome-popup-title"
              className={`text-2xl md:text-[26px] font-extrabold tracking-tight leading-tight ${themeStyles.text}`}
            >
              {data.title}
            </h2>
          )}

          {data.subtitle && (
            <p className={`mt-1.5 text-sm font-semibold ${themeStyles.subText}`}>{data.subtitle}</p>
          )}

          {!hasImage && data.discount_text && (
            <div className="mt-4 inline-flex items-baseline gap-2">
              <span className={`text-5xl font-black tracking-tight ${themeStyles.text}`}>
                {data.discount_text}
              </span>
            </div>
          )}

          {data.message && (
            <p className={`mt-3 text-[15px] leading-relaxed whitespace-pre-line ${themeStyles.subText}`}>
              {colorizeMessage(data.message)}
            </p>
          )}

          {/* Coupon */}
          {data.coupon_code && (
            <button
              onClick={copyCode}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed ${themeStyles.couponBox} font-mono font-bold text-sm tracking-widest hover:scale-[1.02] transition-transform`}
              aria-label="Copy coupon code"
            >
              <span>{data.coupon_code}</span>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 opacity-70" />}
              <span className="text-[10px] font-sans font-semibold opacity-70 ml-1">
                {copied ? "COPIED" : "TAP TO COPY"}
              </span>
            </button>
          )}

          {/* Countdown */}
          {countdown && (
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl ${themeStyles.countdownBox}`}>
              <Clock className={`w-4 h-4 ${themeStyles.subText}`} />
              <span className={`text-[11px] uppercase tracking-wider font-semibold ${themeStyles.subText}`}>
                Ends in
              </span>
              <div className="flex items-center gap-1 font-mono font-extrabold text-sm">
                {countdown.d > 0 && (
                  <>
                    <span className={themeStyles.countdownNum}>{countdown.d}d</span>
                    <span className={themeStyles.subText}>:</span>
                  </>
                )}
                <span className={themeStyles.countdownNum}>{String(countdown.h).padStart(2, "0")}</span>
                <span className={themeStyles.subText}>:</span>
                <span className={themeStyles.countdownNum}>{String(countdown.m).padStart(2, "0")}</span>
                <span className={themeStyles.subText}>:</span>
                <span className={themeStyles.countdownNum}>{String(countdown.s).padStart(2, "0")}</span>
              </div>
            </div>
          )}

          {/* CTAs */}
          {(data.cta_text || data.secondary_cta_text) && (
            <div className="mt-5 flex flex-col items-center gap-2">
              {data.cta_text && data.cta_link && (
                <a
                  href={data.cta_link}
                  className={`inline-flex h-11 w-full max-w-[280px] items-center justify-center rounded-full px-6 text-sm font-bold ${themeStyles.primaryBtn} transition`}
                >
                  {data.cta_text}
                </a>
              )}
              {data.secondary_cta_text && (
                <a
                  href={data.secondary_cta_link || "#"}
                  onClick={(e) => {
                    if (!data.secondary_cta_link) {
                      e.preventDefault();
                      close();
                    }
                  }}
                  className={`text-xs font-semibold underline-offset-4 hover:underline ${themeStyles.secondaryBtn}`}
                >
                  {data.secondary_cta_text}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
