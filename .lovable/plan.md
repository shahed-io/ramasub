# Admin Panel — Tracking + Content/SEO + AI SEO Suite

## লক্ষ্য
স্ক্রিনশটের নির্বাচিত ১৩টি ফিচার সম্পূর্ণ কার্যকর করে অ্যাডমিন প্যানেলে যোগ করা।

## স্কোপ (অনুমোদিত)
**Tracking & Pixels** — Facebook Pixel, FB Custom Audiences, Google Ads, Other Pixels
**Content & SEO (core)** — Blog, Help Center, Media Library, SEO Manager, Site Verification
**AI SEO suite** — AI Blog Topics, Topical Authority, Product Content (AI), Image SEO Audit

স্কিপ: Search Console, Semrush Rankings, SEO Monitor, Analytics & Reports, Telegram Shop Bot — পরে আলাদা টার্নে।

## ৩ ফেজে ডেলিভারি

আমি ৩টি ভিন্ন রিকোয়েস্টে কাজ করতে চাই — এক টার্নে ১৩টি ফিচার ভালো ভাবে দিতে পারব না (কোয়ালিটি ও ক্রেডিট দুটোই বিবেচনায়)। প্রতি ফেজ শেষে আপনি প্রিভিউ দেখে পরের ফেজে যাবেন।

---

### Phase 1 — Tracking & Pixels (এই টার্নে)

**একটি ইউনিফাইড পেজ** `/admin/tracking-pixels` — ৪টি ট্যাবে সব পিক্সেল।

**DB টেবিল:** `tracking_pixels` (admin-only RLS)
- `provider` (enum: `facebook_pixel`, `fb_audience`, `google_ads`, `other`)
- `pixel_id`, `access_token` (encrypted hint), `account_id`
- `enabled`, `events_config` (jsonb), `custom_script` (text — Other Pixels-এর জন্য)
- `notes`, sort_order

**Public side ইনজেকশন:**
- `src/components/TrackingScripts.tsx` — `__root.tsx`-এ একবার মাউন্ট
- Facebook Pixel: standard fbq snippet + PageView
- Google Ads: gtag config
- Other Pixels: সরাসরি `dangerouslySetInnerHTML` দিয়ে কাস্টম স্ক্রিপ্ট
- ইভেন্ট হেল্পার: `trackEvent('Purchase', { value, currency })` — Cart, Checkout, ProductView থেকে কল

**FB Custom Audiences:**
- সার্ভার fn `syncFbAudience` — orders/customers থেকে hashed email/phone Meta CAPI-তে পাঠাবে
- ম্যানুয়াল "Sync now" বাটন + cron-ready
- সিক্রেট: `FB_CAPI_ACCESS_TOKEN` (add_secret দিয়ে চাইব)

**Admin UI:** ৪ ট্যাব — সব ফর্ম + টেস্ট বাটন + recent events লগ।

---

### Phase 2 — Content & SEO core (পরের টার্নে)

- **Blog:** `blog_posts` টেবিল (title, slug, content markdown, excerpt, cover, tags, status, published_at, seo fields), `/admin/blog` CRUD + পাবলিক `/blog/$slug` রুট
- **Help Center:** `help_articles` + `help_categories`, `/admin/help-center` + পাবলিক `/help`
- **Media Library:** `admin-uploads` bucket browser — গ্রিড ভিউ, আপলোড, ট্যাগ, সার্চ, কপি URL, ফোল্ডার
- **SEO Manager:** প্রতি route-এর meta (title/description/og) `seo_meta` টেবিলে; `__root.tsx`-এ লোডার থেকে ইনজেক্ট
- **Site Verification:** Google/Bing/Yandex/Pinterest টোকেন → `__root.tsx` head-এ meta ট্যাগ

---

### Phase 3 — AI SEO suite (তৃতীয় টার্নে)

Lovable AI Gateway (`google/gemini-3-flash-preview`) দিয়ে edge functions:
- **AI Blog Topics:** keyword + niche → ১০টি টপিক + outline
- **Topical Authority:** seed keyword → cluster map + internal-linking suggestion
- **Product Content (AI):** product থেকে SEO description, FAQ, meta auto-generate (এটা ইতিমধ্যে আংশিক আছে — `product-ai` edge fn)
- **Image SEO Audit:** products/blog-এর সব ইমেজ স্ক্যান → alt missing, oversized, no-webp রিপোর্ট + bulk-fix

---

## এই টার্নে ডেলিভারেবল (Phase 1)

1. মাইগ্রেশন: `tracking_pixels` টেবিল + RLS
2. `/admin/tracking-pixels` route — ৪ ট্যাব ফর্ম
3. `TrackingScripts.tsx` কম্পোনেন্ট + `__root.tsx`-এ মাউন্ট
4. `trackEvent` হেল্পার + key ইভেন্ট hookup (PageView, AddToCart, Purchase)
5. FB CAPI server fn + sync বাটন (token দিতে হবে)
6. সাইডবার মেনুতে "Tracking & Pixels" এন্ট্রি (Marketing group-এ)
7. হাইড্রেশন error fix (admin shell-এ)

## কনফার্মেশন দরকার
- Phase-by-phase approach ঠিক আছে?
- Phase 1-এ `FB_CAPI_ACCESS_TOKEN` সিক্রেট চাইব — এখনই অ্যাড করবেন?
