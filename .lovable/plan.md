## লক্ষ্য
Admin panel-এ যেসব section এখন ফাঁকা (`site_settings`, `homepage_config`, content pages, invoice defaults ইত্যাদি), সেগুলোতে Rama Sub সম্পর্কে confirmed তথ্য দিয়ে seed করব। যা জানি না (GA4 ID, GTM ID, verification codes, Meta pixel, Google Ads, Telegram bot token, Zoom API, custom OpenAI/Gemini keys, address ইত্যাদি) সেগুলো ফাঁকা রাখব — admin পরে বসাবেন।

## যেসব "জানা" তথ্য বসাব
Codebase + memory + প্রকাশিত domain থেকে নেওয়া:
- Brand: **Rama Sub** / `RAMASUB.COM`
- Domain: `https://ramasub.com`
- Support email: `support@ramasub.com`
- Admin email: `ramasubofficialweb@gmail.com` (handle_new_user trigger থেকে)
- WhatsApp: `01601048085` (settings placeholder + শপে ব্যবহৃত)
- Currency: BDT / ৳
- Order prefix: `RS`
- Twitter: `@ramasub`
- OG cover: `https://ramasub.com/og-cover.jpg`
- Product categories: AI Tools, Streaming, Design, Productivity, Learning, Music, VPN (existing products থেকে)

## কী কী update হবে

### 1) `admin_records` seed/patch (data only, insert tool দিয়ে)
- **`site_settings`** — নতুন row insert:
  - `site_name: "Rama Sub"`, `support_email`, `whatsapp_number`, `admin_email`, `currency_code: "BDT"`, `currency_symbol: "৳"`, `order_number_prefix: "RS"`, `minimum_order_amount: 0`
  - `address`, `telegram_bot_token`, `telegram_chat_id`, `openai_key`, `gemini_keys`, `whatsapp_notify_number` → ফাঁকা
- **`homepage_config`** — নতুন row insert:
  - Default sections (banner, pills, featured, rails, recentlyViewed, reviews) সব visible
  - `seo.title/description/ogTitle/ogDescription` Rama Sub tagline দিয়ে
  - `featuredProductSlugs: []` (auto)
- **`invoice_design`** — existing row patch: `companyPhone`, `companyAddress`, `thankYouText` Bangla-friendly copy দিয়ে fill; brand colors অপরিবর্তিত
- **`seo_settings`** — existing row অপরিবর্তিত (already seeded)

### 2) `site_pages` content fill (INSERT/UPDATE data only)
এই ৬টি content page-এর `content.blocks` এবং `seo` কে Rama Sub-এর প্রকৃত copy দিয়ে ভরব (এখন প্রতিটি মাত্র ২ block placeholder):
- **about** — Rama Sub-এর story, mission, কেন BD-র সেরা premium subscription shop, warranty ও instant delivery highlight
- **contact** — support email, WhatsApp, response time, business hours
- **privacy-policy** — কী ডাটা collect করা হয়, কীভাবে use হয়, cookies, user rights (standard Bangla + English)
- **delivery-info** — instant vs manual delivery, average time, warranty, credential delivery mechanism
- **refund-request** — refund eligibility (7 দিন warranty), process, wallet credit rules
- **order-cancellation** — কখন cancel করা যাবে, কীভাবে request দিতে হবে, refund path

প্রতিটি page-এর SEO title/description ও আপডেট করব (unique, keyword-rich)।

### 3) যেগুলো ফাঁকাই রাখব (admin পরে বসাবেন)
- GA4 measurement ID, GTM ID, Google/Bing/Yandex/Facebook verification
- Meta Pixel, Google Ads, Search Console API keys
- Telegram bot token / chat ID
- Zoom API credentials
- OpenAI / Gemini API keys
- Custom banner slides ও promotions (product-specific — admin decide করবেন)
- Homepage banner slider (existing slides থাকলে অপরিবর্তিত, না থাকলে ফাঁকাই)

## Files/DB touched
- **DB (data only, migration নয়)**: `admin_records` (site_settings insert, homepage_config insert, invoice_design update), `site_pages` (6 content pages update)
- **Code file changes**: নেই — শুধু seed data। যদি dropdown/placeholder-এ hardcoded default প্রয়োজন হয় (e.g. `order_number_prefix` fallback "AN" → "RS"), সেখানে ছোট ২-১টা string edit করতে পারি।

## সীমাবদ্ধতা
- Products, orders, coupons, users — এগুলো real business data, seed করব না।
- Analytics/pixel/API key fields ফাঁকা রাখব, কারণ real value দরকার এবং তা admin-এর কাছে আছে।
