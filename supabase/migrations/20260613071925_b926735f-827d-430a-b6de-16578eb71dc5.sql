
-- 1. Promotions: hide coupon codes from anonymous users
DROP POLICY IF EXISTS "Anyone can view active promotions" ON public.promotions;
CREATE POLICY "Authenticated can view active promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.promotions FROM anon;

-- Public-safe view without the `code` column for any future anon use
CREATE OR REPLACE VIEW public.promotions_public
  WITH (security_invoker = true) AS
SELECT id, title, description, badge, product_slug, discount_percent,
       starts_at, ends_at, is_active, created_at
FROM public.promotions
WHERE is_active = true;
GRANT SELECT ON public.promotions_public TO anon, authenticated;

-- 2. support_tickets: only authenticated can insert
DROP POLICY IF EXISTS "Users create own tickets" ON public.support_tickets;
CREATE POLICY "Users create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. admin_mfa_grants: explicitly block client-side writes (only service_role/SECURITY DEFINER may write)
CREATE POLICY "Block client INSERT on admin_mfa_grants"
  ON public.admin_mfa_grants AS RESTRICTIVE FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Block client UPDATE on admin_mfa_grants"
  ON public.admin_mfa_grants AS RESTRICTIVE FOR UPDATE
  TO authenticated, anon
  USING (false);
CREATE POLICY "Block client DELETE on admin_mfa_grants"
  ON public.admin_mfa_grants AS RESTRICTIVE FOR DELETE
  TO authenticated, anon
  USING (false);

-- 4. Set immutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
