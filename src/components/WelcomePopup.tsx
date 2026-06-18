import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Professional multi-color highlighter for marketing copy.
// Detects important keywords (Bangla + English) and wraps each in a branded gradient span.
const HIGHLIGHTS: Array<{ pattern: RegExp; className: string }> = [
  // Trust / quality words — violet
  {
    pattern: /(বিশ্বস্ত|ভেরিফাইড|নিরাপদ|অরিজিনাল|গ্যারান্টি|Verified|Trusted|Premium)/g,
    className: "font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent",
  },
  // Product categories — indigo/blue
  {
    pattern: /(ডিজিটাল মার্কেটপ্লেস|মার্কেটপ্লেস|সাবস্ক্রিপশন|সফটওয়্যার|লাইসেন্স|AI টুলস|AI Tools|Streaming|Marketplace)/g,
    className: "font-bold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent",
  },
  // Support / time — emerald
  {
    pattern: /(24\/7|২৪\/৭|লাইভ সাপোর্ট|Live Support|সাপোর্ট)/g,
    className: "font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent",
  },
  // Action / urgency — rose/orange
  {
    pattern: /(এক ক্লিকেই|এক ক্লিকে|ইনস্ট্যান্ট|Instant|মুহূর্তেই|দ্রুত|ডিজিটাল প্রয়োজন|প্রয়োজন)/g,
    className: "font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent",
  },
];

function colorizeMessage(text: string): ReactNode[] {
  // Combine all patterns into one master regex so split preserves match positions correctly.
  const combined = new RegExp(
    "(" + HIGHLIGHTS.map((h) => h.pattern.source).join("|") + ")",
    "g",
  );
  const parts = text.split(combined).filter((p) => p !== undefined);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    const hit = HIGHLIGHTS.find((h) => new RegExp("^(?:" + h.pattern.source + ")$").test(part));
    if (hit) {
      out.push(
        <span key={i} className={hit.className}>
          {part}
        </span>,
      );
    } else {
      out.push(<span key={i}>{part}</span>);
    }
  });
  return out;
}


type PopupData = {
  enabled?: boolean;
  title?: string;
  message?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
};

const STORAGE_KEY = "welcome_popup_dismissed_v1";

export function WelcomePopup() {
  const [data, setData] = useState<PopupData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) return;
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
        if (!d.image_url && !d.title && !d.message) return;
        setData(d);
        // small delay so it doesn't flash during page load
        setTimeout(() => !cancelled && setOpen(true), 800);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open || !data) return null;

  const hasImage = !!data.image_url;
  const hasText = !!(data.title || data.message || data.cta_text);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)] ring-1 ring-white/40 bg-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur grid place-items-center text-slate-700 hover:bg-white shadow-md ring-1 ring-slate-200"
        >
          <X className="w-4 h-4" />
        </button>

        {hasImage && (
          <a
            href={data.cta_link || "#"}
            onClick={(e) => {
              if (!data.cta_link) e.preventDefault();
            }}
            className="block"
          >
            <img
              src={data.image_url}
              alt={data.title || "Promotion"}
              className="w-full h-auto block"
              loading="eager"
            />
          </a>
        )}

        {hasText && (
          <div className="p-5 text-center">
            {data.title && (
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{data.title}</h2>
            )}
            {data.message && (
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
                {colorizeMessage(data.message)}
              </p>
            )}
            {data.cta_text && data.cta_link && (
              <a
                href={data.cta_link}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full px-5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-semibold shadow-[0_10px_24px_-10px_rgba(139,92,246,0.7)] hover:opacity-95"
              >
                {data.cta_text}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
