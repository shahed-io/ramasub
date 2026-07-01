# Admin Pages CMS (WordPress/Elementor-style)

আপনার admin panel-এ একটা "Pages" section তৈরি হবে যেখান থেকে ওয়েবসাইটের সব page-এর content, SEO, visibility control করা যাবে — অনেকটা WordPress Pages-এর মত।

## User-facing capabilities

**Admin → Pages list** (`/admin/pages`)
- সব site page একটা table-এ: Home, Products, Categories, Streaming, Blog, Checkout, Cart, Wallet, About/Contact/Privacy/Terms/Delivery/Refund ইত্যাদি
- প্রতিটি row: Title | Path | Status (Published/Draft/Hidden) | Last edited | Edit button
- Search + status filter

**Admin → Page editor** (`/admin/pages/:key`)
Tabs:
1. **Content** — Visual block editor (Add block → Heading, Paragraph, Rich Text, Image, Button/CTA, Divider, HTML embed, 2-column, FAQ item). Drag-to-reorder, duplicate, delete. Live preview panel সহ।
2. **SEO** — Title, Meta description, OG image (upload), canonical override, noindex toggle
3. **Settings** — Publish/Draft/Hidden toggle, custom slug (info pages only), show/hide in menu

**Frontend behavior**
- প্রতিটি route load-এর সময় DB থেকে সেই page-এর blocks + meta পড়বে
- Blocks render হবে একটা `<PageRenderer blocks={...} />` component দিয়ে
- SEO meta route-এর `head()`-এ inject হবে (loader থেকে)
- Status = Draft/Hidden হলে সাধারণ user-এর জন্য "Coming soon" fallback, admin-এর জন্য যথারীতি
- Hidden pages sitemap থেকে বাদ

## Scope decisions (important)

**Structured pages** (Home, Products, Checkout, Cart, Wallet, Auth, Dashboard, Admin ইত্যাদি): এদের complex logic আছে (cart items, payment, forms) — সম্পূর্ণ block editor দিয়ে replace করা বাস্তবসম্মত না। এদের জন্য **editable text zones + SEO** থাকবে (যেমন Checkout page-এর heading, sub-heading, notice text, button labels, empty-cart message)। Business logic অক্ষত থাকবে।

**Content pages** (About, Contact, Privacy, Terms, Delivery-Info, Refund, Order-Cancellation, blog landing): **সম্পূর্ণ block editor** — admin যা ইচ্ছা reorder/edit করতে পারবে।

**Homepage sections** (hero banner, feature strip, testimonials, gift banner): প্রতিটি section-কে toggleable block হিসেবে expose — show/hide + text override। Product grid/carousel-এর data source unchanged।

## Technical section

### Database (1 migration)

```
site_pages
  id uuid pk
  key text unique          -- 'home', 'about', 'checkout', 'privacy'...
  title text
  path text                -- '/', '/about', '/checkout'
  page_type text           -- 'content' | 'structured' | 'home_section'
  status text default 'published'  -- published|draft|hidden
  seo jsonb                -- {title, description, og_image, canonical, noindex}
  content jsonb            -- {blocks: [...], text_zones: {...}, section_toggles: {...}}
  show_in_menu bool
  sort_order int
  updated_by uuid
  created_at/updated_at

  RLS: SELECT anon+authenticated where status='published'
       ALL to authenticated where has_role(admin)
  GRANT SELECT to anon, authenticated
  GRANT ALL to service_role, authenticated (admin gated by RLS)
```

Seed migration pre-populates rows for every known site route (~20 pages) with default content pulled from current hard-coded JSX so nothing breaks on day one.

### Block schema (JSON)

```
{ type: 'heading', level: 1|2|3, text, align }
{ type: 'paragraph', html }         // sanitized rich text
{ type: 'image', url, alt, caption, width }
{ type: 'button', label, href, variant }
{ type: 'divider' }
{ type: 'html', code }              // admin-only escape hatch
{ type: 'columns', cols: [[...blocks], [...blocks]] }
{ type: 'faq', items: [{q, a}] }
```

### Files

- `supabase/migrations/…_site_pages.sql` — table + RLS + seed
- `src/lib/pages.functions.ts` — `listPages`, `getPageByKey` (public, publishable client), `savePage` (`requireSupabaseAuth` + admin check)
- `src/lib/pages.ts` — types + `usePage(key)` React Query hook (10-min stale)
- `src/components/PageRenderer.tsx` — renders block array
- `src/components/admin/BlockEditor.tsx` — add/reorder/edit blocks with dnd-kit (already in deps)
- `src/components/admin/BlockInspector.tsx` — per-block field panel
- `src/routes/admin.pages.tsx` — list view (matches admin design system)
- `src/routes/admin.pages.$key.tsx` — editor with Content/SEO/Settings tabs
- Update existing content routes (`about`, `contact`, `privacy-policy`, `delivery-info`, `refund-request`, `order-cancellation`) to fetch `usePage(key)` and render via `<PageRenderer />`, with hard-coded JSX as fallback if no row
- Update structured routes (`checkout`, `cart`, `wallet`, home hero copy) to read text-zone overrides for specific labels
- Update `head()` on those routes to pull SEO meta from loader data
- `src/routes/sitemap.xml.ts` — exclude pages where status ≠ published
- Add "Pages" entry to admin sidebar under Content group

### Non-goals (out of scope)

- Full drag-drop pixel-perfect layout editor (Elementor-scale)
- Editing admin panel routes themselves
- Version history / revisions (can add later)
- Multi-language content

## Delivery

একটা migration + 8-10টা নতুন file + ~6টা existing content route-এ small update। Migration approval-এর পর সব code একসাথে ship হবে।

**Approve করলে building শুরু করবো।**