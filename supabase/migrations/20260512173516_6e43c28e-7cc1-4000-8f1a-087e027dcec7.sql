CREATE INDEX IF NOT EXISTS idx_products_active_sort
  ON public.products (is_active, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON public.products (category)
  WHERE is_active = true;