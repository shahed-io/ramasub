import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { optimizeSupabaseImage } from "@/lib/image-url";

/** Brand-domain guesser → logo CDN (no API key) */
function guessLogoUrl(name: string): string {
  const map: Record<string, string> = {
    netflix: "netflix.com",
    spotify: "spotify.com",
    "youtube premium": "youtube.com",
    youtube: "youtube.com",
    "prime video": "primevideo.com",
    "amazon prime": "primevideo.com",
    "disney+": "disneyplus.com",
    disney: "disneyplus.com",
    hoichoi: "hoichoi.tv",
    chorki: "chorki.com",
    "chatgpt plus": "openai.com",
    chatgpt: "openai.com",
    openai: "openai.com",
    claude: "claude.ai",
    gemini: "gemini.google.com",
    "google one": "one.google.com",
    coursera: "coursera.org",
    grammarly: "grammarly.com",
    "canva pro": "canva.com",
    canva: "canva.com",
    capcut: "capcut.com",
    adobe: "adobe.com",
    "adobe cc": "adobe.com",
    freepik: "freepik.com",
    autodesk: "autodesk.com",
    truecaller: "truecaller.com",
    zoom: "zoom.us",
    slack: "slack.com",
    nordvpn: "nordvpn.com",
    expressvpn: "expressvpn.com",
    surfshark: "surfshark.com",
    proton: "proton.me",
    windows: "microsoft.com",
    "microsoft office": "microsoft.com",
    office: "microsoft.com",
    "microsoft 365": "microsoft.com",
    apple: "apple.com",
    itunes: "apple.com",
    "app store": "apple.com",
    "google play": "play.google.com",
    psn: "playstation.com",
    notion: "notion.so",
  };
  const k = name.trim().toLowerCase();
  let domain = map[k];
  if (!domain) {
    for (const key of Object.keys(map)) {
      if (k.includes(key)) { domain = map[key]; break; }
    }
  }
  if (!domain) domain = `${k.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`;
  return domain;
}

function logoSources(name: string): string[] {
  const domain = guessLogoUrl(name);
  if (domain === "openai.com") {
    return [
      "/images/chatgpt-logo.webp",
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ];
  }
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://logo.clearbit.com/${domain}`,
    `https://icon.horse/icon/${domain}`,
  ];
}

export function ProductBanner({
  product,
  className = "",
  ratio = "1/1",
  priority = false,
}: {
  product: Product;
  className?: string;
  ratio?: "5/4" | "4/3" | "1/1" | "16/9";
  /** legacy prop — ignored, kept for compat */
  spheres?: number;
  priority?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [logoIdx, setLogoIdx] = useState(0);
  const primary = useMemo(
    () => optimizeSupabaseImage(product.imageUrl, { width: priority ? 800 : 480, quality: 72 }),
    [product.imageUrl, priority]
  );
  const logos = useMemo(() => logoSources(product.name), [product.name]);
  const currentLogo = logos[logoIdx];
  const allLogosFailed = logoIdx >= logos.length;

  const aspectClass =
    ratio === "4/3" ? "aspect-[4/3]" :
    ratio === "5/4" ? "aspect-[5/4]" :
    ratio === "16/9" ? "aspect-[16/9]" :
    "aspect-square";

  return (
    <div
      className={`product-banner-clean relative overflow-hidden ${aspectClass} ${className} flex items-center justify-center`}
    >
      {primary && !imgFailed ? (
        <img
          src={primary}
          alt={`${product.name} — ${product.category ?? "premium subscription"} available in Bangladesh`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          width={1024}
          height={1024}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
          className="relative z-10 w-full h-full object-cover"
          onError={(e) => {
            // If the transformed URL fails (transforms not enabled),
            // fall back to the original public object URL once before
            // surrendering to the logo fallback.
            const img = e.currentTarget;
            if (product.imageUrl && img.src !== product.imageUrl) {
              img.src = product.imageUrl;
            } else {
              setImgFailed(true);
            }
          }}
        />
      ) : !allLogosFailed ? (
        <img
          key={currentLogo}
          src={currentLogo}
          alt={`${product.name} logo — ${product.category ?? "digital subscription"}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          width={256}
          height={256}
          className="relative z-10 max-h-[72%] max-w-[72%] object-contain"
          onError={() => setLogoIdx((i) => i + 1)}
        />
      ) : (
        <span className="relative z-10 text-7xl">{product.emoji}</span>
      )}
    </div>
  );
}
