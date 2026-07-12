-- Restrict public SELECT on sensitive admin_records kinds (credentials + ad platform tokens)
-- These must only be readable by admins/service_role, even when is_active=true.
CREATE POLICY "Sensitive kinds admin-only read"
ON public.admin_records
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  kind NOT IN (
    'account_delivery',
    'fb_pixel',
    'ga4_realtime',
    'bkash_pgw',
    'eps_pgw',
    'sslcommerz_pgw',
    'blog_autogen_config',
    'license_key',
    'customer_license'
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);