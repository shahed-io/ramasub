
-- Site pages CMS: single table storing content blocks, SEO meta, and status for every site page

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  path text NOT NULL,
  page_type text NOT NULL DEFAULT 'content' CHECK (page_type IN ('content','structured','home_section')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','hidden')),
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{"blocks":[],"text_zones":{},"section_toggles":{}}'::jsonb,
  show_in_menu boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_pages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published pages"
  ON public.site_pages FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage pages"
  ON public.site_pages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_site_pages_touch
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_site_pages_key ON public.site_pages(key);
CREATE INDEX idx_site_pages_status ON public.site_pages(status) WHERE status = 'published';

-- Seed rows for known site pages (idempotent: does nothing if key already exists)
INSERT INTO public.site_pages (key, title, path, page_type, status, seo, content, sort_order) VALUES
  ('home', 'Home', '/', 'structured', 'published',
    '{"title":"RamaSub — Premium Digital Subscriptions","description":"Netflix, Spotify, ChatGPT, Canva and more — instant delivery, wallet payments, 24/7 support."}'::jsonb,
    '{"blocks":[],"text_zones":{"hero_title":"Premium Digital Subscriptions","hero_subtitle":"Instant delivery. Wallet payments. 24/7 support."},"section_toggles":{"banner":true,"gift_banner":true,"features":true,"testimonials":true,"faq":true}}'::jsonb,
    1),
  ('products', 'All Products', '/products', 'structured', 'published',
    '{"title":"All Subscriptions — RamaSub","description":"Browse every digital subscription on RamaSub."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"All Subscriptions","page_subtitle":"Choose your favorite plan"}}'::jsonb, 2),
  ('categories', 'Categories', '/categories', 'structured', 'published',
    '{"title":"Categories — RamaSub","description":"Browse subscriptions by category."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Categories"}}'::jsonb, 3),
  ('streaming', 'Streaming', '/streaming', 'structured', 'published',
    '{"title":"Streaming Subscriptions — RamaSub","description":"Netflix, Prime, Disney+ and more."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Streaming"}}'::jsonb, 4),
  ('cart', 'Cart', '/cart', 'structured', 'published',
    '{"title":"Your Cart — RamaSub","description":"Review the items in your cart."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Your Cart","empty_message":"Your cart is empty","checkout_cta":"Proceed to Checkout"}}'::jsonb, 5),
  ('checkout', 'Checkout', '/checkout', 'structured', 'published',
    '{"title":"Checkout — RamaSub","description":"Complete your order securely."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Checkout","notice":"Please double-check your information before placing the order.","place_order_cta":"Place Order"}}'::jsonb, 6),
  ('wallet', 'Wallet', '/wallet', 'structured', 'published',
    '{"title":"Wallet — RamaSub","description":"Top up and manage your RamaSub wallet."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Wallet","topup_hint":"Add funds to pay orders instantly."}}'::jsonb, 7),
  ('dashboard', 'Dashboard', '/dashboard', 'structured', 'published',
    '{"title":"Dashboard — RamaSub","description":"Your RamaSub account overview."}'::jsonb, '{"blocks":[]}'::jsonb, 8),
  ('blog', 'Blog', '/blog', 'structured', 'published',
    '{"title":"Blog — RamaSub","description":"Guides, tips and news from RamaSub."}'::jsonb,
    '{"blocks":[],"text_zones":{"page_title":"Blog","page_subtitle":"Guides & updates"}}'::jsonb, 9),
  ('about', 'About Us', '/about', 'content', 'published',
    '{"title":"About RamaSub","description":"Learn about RamaSub — Bangladesh''s trusted digital subscription store."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"About RamaSub","align":"center"},{"id":"b2","type":"paragraph","html":"RamaSub is Bangladesh''s trusted digital subscription store. We deliver premium subscriptions instantly with 24/7 support."}]}'::jsonb, 10),
  ('contact', 'Contact', '/contact', 'content', 'published',
    '{"title":"Contact — RamaSub","description":"Get in touch with RamaSub support."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"Contact Us","align":"center"},{"id":"b2","type":"paragraph","html":"Email us at support@ramasub.com or use WhatsApp for instant help."}]}'::jsonb, 11),
  ('privacy-policy', 'Privacy Policy', '/privacy-policy', 'content', 'published',
    '{"title":"Privacy Policy — RamaSub","description":"How RamaSub handles your data."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"Privacy Policy"},{"id":"b2","type":"paragraph","html":"We respect your privacy. Contact support@ramasub.com for any privacy question."}]}'::jsonb, 12),
  ('delivery-info', 'Delivery Info', '/delivery-info', 'content', 'published',
    '{"title":"Delivery Info — RamaSub","description":"How RamaSub delivers your subscription."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"Delivery Information"},{"id":"b2","type":"paragraph","html":"Most subscriptions are delivered within minutes after payment confirmation."}]}'::jsonb, 13),
  ('refund-request', 'Refund Policy', '/refund-request', 'content', 'published',
    '{"title":"Refund Policy — RamaSub","description":"RamaSub refund policy."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"Refund Policy"},{"id":"b2","type":"paragraph","html":"Email support@ramasub.com. Replies usually within 2–6 hours."}]}'::jsonb, 14),
  ('order-cancellation', 'Order Cancellation', '/order-cancellation', 'content', 'published',
    '{"title":"Order Cancellation — RamaSub","description":"How to cancel a RamaSub order."}'::jsonb,
    '{"blocks":[{"id":"b1","type":"heading","level":1,"text":"Order Cancellation"},{"id":"b2","type":"paragraph","html":"Contact support@ramasub.com to cancel an unshipped order."}]}'::jsonb, 15)
ON CONFLICT (key) DO NOTHING;
