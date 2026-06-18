import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { Minus, Plus, Star, ArrowLeft, Loader2, CreditCard, MessageCircle, ShoppingCart, Check } from "lucide-react";
import { useProducts, useProduct } from "@/hooks/useProducts";
import { badgeColorFor } from "@/lib/badgeColor";
import { useEffect, useState } from "react";
import { recordRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCart } from "@/context/CartContext";
import { trackViewContent } from "@/lib/trackEvent";

import { ProductBanner } from "@/components/ProductBanner";
import { optimizeSupabaseImage } from "@/lib/image-url";
import { useShopConfig } from "@/hooks/useShopConfig";
import { getProduct } from "@/lib/products.functions";
import { ProductMarkdown } from "@/components/ProductMarkdown";
import { SiteFooter } from "@/components/SiteFooter";
import { GlassCard } from "@/components/ui-glass/GlassCard";
import { GlassButton } from "@/components/ui-glass/GlassButton";
import { waOrderUrl } from "@/lib/whatsapp";
import { ProductReviews } from "@/components/ProductReviews";

const parsePrice = (p: unknown): number => {
  try {
    if (p == null) return 0;
    if (typeof p === "number") return Number.isFinite(p) ? p : 0;
    const s = typeof p === "string" ? p : String(p);
    const n = Number(s.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

function toEmbedUrl(raw?: string): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;
  try {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return url;
    return url;
  } catch { return null; }
}

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.slug],
      queryFn: () => getProduct({ data: { slug: params.slug } }),
      staleTime: 10 * 60_000,
    });
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    const url = `https://accessnowbd.com/product/${params.slug}`;
    if (!p) {
      return {
        meta: [
          { title: "Subscription details — AccessNow BD" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const seoTitle = p.meta?.seo_title?.trim() || `${p.name} — Buy in Bangladesh | AccessNow BD`;
    const seoDesc =
      p.meta?.meta_description?.trim() ||
      p.shortDescription?.trim() ||
      p.tagline?.trim() ||
      `Get ${p.name} subscription in Bangladesh at the best price. Instant delivery, genuine access, trusted support from AccessNow BD.`;
    const firstPlan = p.plans?.[0];
    const priceNum = firstPlan ? Number(String(firstPlan.price).replace(/[^\d.]/g, "")) : 0;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: seoDesc,
      ...(p.imageUrl ? { image: p.imageUrl } : {}),
      brand: { "@type": "Brand", name: p.category || "AccessNow BD" },
      category: p.category,
      sku: p.slug,
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "BDT",
        price: priceNum > 0 ? priceNum.toString() : "0",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "AccessNow BD" },
      },
    };
    return {
      meta: [
        { title: seoTitle },
        { name: "description", content: seoDesc },
        ...(p.meta?.tags?.length ? [{ name: "keywords", content: p.meta.tags.join(", ") }] : []),
        { property: "og:title", content: seoTitle },
        { property: "og:description", content: seoDesc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "AccessNow BD" },
        ...(p.imageUrl
          ? [
              { property: "og:image", content: p.imageUrl },
              { name: "twitter:image", content: p.imageUrl },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seoTitle },
        { name: "twitter:description", content: seoDesc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://accessnowbd.com/" },
              { "@type": "ListItem", position: 2, name: "All Subscriptions", item: "https://accessnowbd.com/products" },
              { "@type": "ListItem", position: 3, name: p.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Link to="/" className="text-primary underline">Back to home</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">Product not found</h1>
        <Link to="/" className="text-primary underline">Back to home</Link>
      </div>
    </div>
  ),
});


function ProductPage() {
  const { slug } = Route.useParams();
  const { product: loaderProduct } = Route.useLoaderData();
  const { product, isLoading } = useProduct(slug, loaderProduct);
  const { products } = useProducts();
  const navigate = useNavigate();
  const { add } = useCart();
  useShopConfig();
  const popularIdx = (loaderProduct?.plans ?? product?.plans ?? []).findIndex((p: { popular?: boolean }) => p.popular);
  const [selected, setSelected] = useState(() => (popularIdx > 0 ? popularIdx : 0));
  const [qty, setQty] = useState(1);
  
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (product?.slug) {
      recordRecentlyViewed(product.slug);
      try {
        trackViewContent({
          id: product.slug,
          name: product.name,
          value: parsePrice(product.plans?.[0]?.price ?? "0"),
        });
      } catch {
        /* ignore */
      }
    }
  }, [product?.slug, product?.name, product?.plans]);


  if (isLoading) return <ProductSkeleton />;
  if (!product) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-2">Product not found</h1>
          <Link to="/" className="text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const activeIdx = Math.min(selected, Math.max(product.plans.length - 1, 0));
  const plan = product.plans[activeIdx];
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 8);

  const galleryImages = (product.meta?.gallery ?? []).filter(Boolean);
  const allImages = [product.imageUrl, ...galleryImages].filter((u): u is string => !!u);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const heroImg = activeImg ?? allImages[0] ?? null;
  const videoEmbed = toEmbedUrl(product.meta?.video_url);

  const addToCart = () => {
    if (!plan) return;
    for (let i = 0; i < qty; i++) {
      add({ slug: product.slug, planPeriod: plan.period, qty: 1, price: parsePrice(plan.price), name: product.name, emoji: product.emoji, gradient: product.gradient });
    }
  };
  const buyNow = () => { addToCart(); navigate({ to: "/checkout" }); };

  const hasDiscount = !!plan?.original && parsePrice(plan.original) > parsePrice(plan.price);

  const faqs = buildFaqs(product);

  return (
    <div key={product.slug} className="product-page-shell relative min-h-screen bg-slate-50 text-slate-900 animate-[product-in_460ms_cubic-bezier(0.22,1,0.36,1)_both]">
      <style>{`@keyframes product-in {0%{opacity:0;transform:translateY(14px);filter:blur(4px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}`}</style>

      <div className="relative mx-auto max-w-6xl px-4 md:px-8 pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
          <Link to="/" className="hover:text-slate-900 inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <span className="text-slate-300">/</span>
          <span className="hover:text-slate-900 transition-colors">{product.category}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 truncate">{product.name}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12 grid md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Media gallery */}
        <div className="md:col-span-6 space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200">
            {heroImg ? (
              <img
                src={optimizeSupabaseImage(heroImg, { width: 900, quality: 75 })}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={900}
                height={900}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== heroImg) img.src = heroImg;
                }}
              />
            ) : (
              <ProductBanner product={product} ratio="1/1" spheres={6} priority className="rounded-3xl overflow-hidden" />
            )}
            {product.badge && (
              <span className={`absolute top-4 left-4 z-20 ${badgeColorFor(product.badge)} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm`}>
                {product.badge}
              </span>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {allImages.slice(0, 8).map((u, i) => {
                const active = (activeImg ?? allImages[0]) === u;
                return (
                  <button
                    key={`${u}-${i}`}
                    type="button"
                    onClick={() => setActiveImg(u)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition shadow-sm ${active ? "border-slate-900" : "border-slate-200 opacity-70 hover:opacity-100"}`}
                    aria-label={`Image ${i + 1}`}
                  >
                    <img
                      src={optimizeSupabaseImage(u, { width: 200, quality: 65 })}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={200}
                      height={200}
                      onError={(e) => { const img = e.currentTarget; if (img.src !== u) img.src = u; }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {videoEmbed && (
            <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm p-2">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
                {/\.(mp4|webm|ogg)(\?|$)/i.test(videoEmbed) ? (
                  <video src={videoEmbed} controls playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <iframe
                    src={videoEmbed}
                    title={`${product.name} preview`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="md:col-span-6 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
          <header>
            <h1 className="font-bold text-slate-900 tracking-tight leading-tight text-2xl md:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {product.tagline?.trim() && (
              <p className="mt-2 text-slate-600 leading-relaxed text-sm md:text-base">
                {product.tagline}
              </p>
            )}

            {product.features && product.features.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-900 text-2xl md:text-3xl">৳{plan ? parsePrice(plan.price).toLocaleString() : 0}.00 <span className="text-base font-semibold text-slate-500">BDT</span></span>
              {hasDiscount && (
                <span className="text-base md:text-lg text-slate-400 line-through font-medium">৳{parsePrice(plan!.original!).toLocaleString()}</span>
              )}
              {hasDiscount && (
                <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-lg text-sm font-bold">Sale</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex text-amber-400">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-sm text-slate-500 font-medium">12 reviews</span>
            </div>
          </header>

          {/* Plans */}
          {product.plans.length > 0 && (
            <div className="mt-6 space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-widest">মেয়াদ ও মূল্য পরিকল্পনা</label>
              <div role="radiogroup" aria-label="Plan" className="space-y-2">
                {product.plans.map((p, idx) => {
                  const active = activeIdx === idx;
                  const price = parsePrice(p.price);
                  const original = p.original ? parsePrice(p.original) : 0;
                  const hasOff = original > price;
                  const off = hasOff ? Math.round(((original - price) / original) * 100) : 0;
                  return (
                    <label
                      key={`${idx}-${p.period}`}
                      className={[
                        "group relative flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all select-none",
                        active
                          ? "bg-indigo-50/50 border-2 border-indigo-600"
                          : "bg-white border border-slate-200 hover:border-slate-300",
                      ].join(" ")}
                    >
                      <input type="radio" name="plan-period" className="sr-only" checked={active} onChange={() => setSelected(idx)} />
                      <div className="flex items-center">
                        <span
                          aria-hidden="true"
                          className={[
                            "w-5 h-5 rounded-full mr-4 shrink-0 transition",
                            active ? "border-4 border-indigo-600 bg-white" : "border border-slate-300",
                          ].join(" ")}
                        />
                        <span className={`font-semibold ${active ? "text-slate-900" : "text-slate-700"}`}>{(p.period?.trim() || (p as { duration?: string; label?: string }).duration?.trim() || (p as { duration?: string; label?: string }).label?.trim() || "Standard Plan")}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasOff && (
                          <span className="text-slate-400 line-through text-sm">৳{original.toLocaleString()}</span>
                        )}
                        <span className={active ? "font-bold text-indigo-600" : "font-bold text-slate-900"}>৳{price.toLocaleString()}</span>
                        {hasOff && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{off}%</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6 space-y-3">
            <label htmlFor="product-qty-input" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity</label>
            <div className="flex items-center w-32 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-10 h-10 grid place-items-center text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <input
                id="product-qty-input"
                aria-label="Quantity"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
                className="w-full text-center bg-transparent font-bold text-slate-900 outline-none"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
                className="w-10 h-10 grid place-items-center text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 space-y-3">
            <button
              onClick={buyNow}
              className="product-buy-button w-full font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>Buy Now</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={plan ? waOrderUrl([{ name: product.name, planPeriod: plan.period, qty, price: parsePrice(plan.price) }]) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="product-whatsapp-button flex items-center justify-center gap-2 font-bold py-3 rounded-2xl hover:opacity-95 transition"
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </a>
              <button
                onClick={addToCart}
                className="product-cart-button flex items-center justify-center gap-2 font-bold py-3 rounded-2xl hover:opacity-95 transition"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Product Description */}
      <section className="relative mx-auto max-w-6xl px-4 md:px-8 pb-2 pt-2">
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6 md:mb-8">
            <div className="w-1 h-8 bg-indigo-600 rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">Product Description</h2>
          </div>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
            <ProductMarkdown source={product.description} />
          </div>
        </div>
      </section>

      {/* Reviews */}
      <ProductReviews slug={slug} />

      {/* FAQ */}
      <section className="relative mx-auto max-w-[1200px] px-4 md:px-8 py-10">
        <h2 className="text-lg font-bold text-foreground mb-4">FAQ</h2>
        <div className="space-y-2">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <GlassCard key={i} tint="teal" blur="lg" glow="sm" padding="none" rounded="xl">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 h-11 text-left text-sm font-medium text-foreground"
                >
                  <span>{f.q}</span>
                  <span className="text-teal-600 text-lg leading-none">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="px-4 pb-4 text-sm text-foreground/85 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="relative mx-auto max-w-[1200px] px-4 md:px-8 py-10">
          <h2 className="text-lg font-bold text-foreground mb-5">Related products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {related.map((p) => {
              const first = p.plans[0];
              const hasOrig = !!first?.original && parsePrice(first.original) > parsePrice(first.price);
              return (
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  key={p.slug}
                  className="group block rounded-xl overflow-hidden backdrop-blur-xl bg-white/40 border border-white/60 hover:bg-white/60 hover:border-teal-300/60 shadow-[0_4px_20px_-8px_rgba(20,184,166,0.25)] hover:shadow-[0_10px_30px_-10px_rgba(20,184,166,0.45)] hover:-translate-y-0.5 transition-all"
                >
                  <ProductBanner product={p} ratio="1/1" spheres={4} className="rounded-none" />
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      {hasOrig && (
                        <span className="text-muted-foreground line-through">Tk {parsePrice(first!.original!)}.00 BDT</span>
                      )}
                      <span className="font-semibold text-foreground">
                        {p.plans.length > 1 ? "From " : ""}Tk {first ? parsePrice(first.price) : 0}.00 BDT
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}

function buildFaqs(product: {
  name: string;
  category?: string;
  delivery_time?: string;
  warranty?: string;
  plans?: { period: string; price: string }[];
}): { q: string; a: string }[] {
  const name = product.name;
  const category = product.category || "subscription";
  const delivery = product.delivery_time || "Within 30 mins";
  const warranty = product.warranty || "Full warranty";
  const plans = product.plans || [];
  const durations = plans.map((p) => p.period).filter(Boolean);
  const minPrice = plans
    .map((p) => parsePrice(p.price))
    .filter((n) => n > 0)
    .sort((a, b) => a - b)[0];

  const durationLine =
    durations.length > 0
      ? `Available durations: ${durations.join(", ")}.`
      : `Multiple duration options are available — pick one above.`;
  const priceLine =
    minPrice && minPrice > 0
      ? `Plans start from ৳${minPrice.toLocaleString()} — the exact price for your selected duration is shown above the duration selector.`
      : `The current price is shown above the duration selector for the selected plan.`;

  return [
    {
      q: `Can I use ${name} in Bangladesh?`,
      a: `Yes — ${name} works fully in Bangladesh through AccessNow BD. We provide verified ${category} access that runs on any device without restrictions.`,
    },
    {
      q: `How fast will I receive my ${name} access?`,
      a: `Delivery time: ${delivery}. After payment is confirmed, your ${name} login or activation details are sent to your email and WhatsApp automatically.`,
    },
    {
      q: `What warranty do I get with ${name}?`,
      a: `Every ${name} order from AccessNow BD includes ${warranty}. If anything stops working during your plan period, contact support and we'll replace or fix it free of charge.`,
    },
    {
      q: `How do I subscribe to ${name} via AccessNow BD?`,
      a: `Choose your duration above, add to cart and complete payment with bKash, Nagad, Rocket, or card. ${durationLine}`,
    },
    {
      q: `How much does ${name} cost in Bangladesh via AccessNow BD?`,
      a: priceLine,
    },
    {
      q: `How do I renew my ${name} subscription with AccessNow BD?`,
      a: `Simply place a new order for ${name} when your current plan is about to expire. We'll keep your existing access active where possible, and your new ${delivery.toLowerCase()} delivery applies to renewals too.`,
    },
  ];
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 rounded-xl ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 pt-6">
        <Shimmer className="h-4 w-64" />
      </div>
      <section className="mx-auto max-w-[1200px] px-4 md:px-8 py-6 grid md:grid-cols-2 gap-10">
        <Shimmer className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Shimmer className="h-10 w-3/4" />
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-4 w-32" />
          <div className="pt-2 grid grid-cols-4 gap-2">
            <Shimmer className="h-9" /><Shimmer className="h-9" /><Shimmer className="h-9" /><Shimmer className="h-9" />
          </div>
          <Shimmer className="h-10 w-32" />
          <Shimmer className="h-11 w-full max-w-md" />
          <Shimmer className="h-11 w-full max-w-md" />
          <div className="flex items-center gap-2 pt-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading product…</span>
          </div>
        </div>
      </section>
    </div>
  );
}
