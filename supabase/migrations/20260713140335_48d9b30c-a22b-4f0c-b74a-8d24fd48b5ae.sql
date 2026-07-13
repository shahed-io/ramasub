
-- Convert the permissive "Sensitive kinds admin-only read" policy to RESTRICTIVE
-- so it filters sensitive kinds even when the public "is_active" policy would allow them.
DROP POLICY IF EXISTS "Sensitive kinds admin-only read" ON public.admin_records;

CREATE POLICY "Sensitive kinds admin-only read"
ON public.admin_records
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  kind <> ALL (ARRAY[
    'account_delivery'::text,
    'fb_pixel'::text,
    'ga4_realtime'::text,
    'bkash_pgw'::text,
    'eps_pgw'::text,
    'sslcommerz_pgw'::text,
    'blog_autogen_config'::text,
    'license_key'::text,
    'customer_license'::text
  ])
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
