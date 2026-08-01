DROP POLICY IF EXISTS "Sensitive kinds admin-only read" ON public.admin_records;

CREATE POLICY "Only public kinds are readable" ON public.admin_records
AS RESTRICTIVE FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR kind = ANY (ARRAY[
    'shop_config','site_settings','payment_method','banner_slider','support_widget',
    'support_channels','whatsapp_button','announcement_bar','footer','menu',
    'category','blog_post','help_article','page','homepage_config',
    'currency_config','referral_settings','seo_settings','ceo_message',
    'biggest_discount','welcome_popup','theme_config','theme_default',
    'product_zoom_settings','checkout_policy'
  ]::text[])
);