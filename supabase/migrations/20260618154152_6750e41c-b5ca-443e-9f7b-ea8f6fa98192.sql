-- Remove anon read on the raw table (it contains access_token)
DROP POLICY IF EXISTS "Anyone can read enabled tracking pixels" ON public.tracking_pixels;
REVOKE SELECT ON public.tracking_pixels FROM anon;

-- Authenticated users still cannot read raw table unless admin
CREATE POLICY "Admins read tracking pixels"
  ON public.tracking_pixels FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public-safe view: only fields needed to inject pixels client-side
CREATE OR REPLACE VIEW public.tracking_pixels_public
WITH (security_invoker = true)
AS
SELECT
  id,
  provider,
  pixel_id,
  account_id,
  conversion_label,
  enabled,
  events_config,
  custom_script,
  sort_order
FROM public.tracking_pixels
WHERE enabled = true;

GRANT SELECT ON public.tracking_pixels_public TO anon, authenticated;