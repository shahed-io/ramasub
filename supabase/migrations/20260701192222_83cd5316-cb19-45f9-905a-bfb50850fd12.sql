-- Perf: partial index tuned to the hot admin_records read pattern
-- (kind = ? AND is_active = true ORDER BY sort_order). Replaces the
-- broader (kind, sort_order) index for these lookups, cutting index-page
-- reads for shop_config / payment_method / support_widget / banner_slider /
-- theme_config queries that fire on nearly every page load.
CREATE INDEX IF NOT EXISTS idx_admin_records_active_kind_sort
  ON public.admin_records (kind, sort_order)
  WHERE is_active = true;

-- Products slug lookups always filter on is_active in practice; the partial
-- index avoids scanning inactive rows for the product-detail path.
CREATE INDEX IF NOT EXISTS idx_products_slug_active
  ON public.products (slug)
  WHERE is_active = true;