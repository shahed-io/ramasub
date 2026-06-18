
-- ORDERS: restrict customer-side INSERT fields
DROP POLICY IF EXISTS "orders_insert_safe_fields" ON public.orders;
CREATE POLICY "orders_insert_safe_fields"
ON public.orders
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND delivered_credentials IS NULL
  AND admin_note IS NULL
  AND COALESCE(whatsapp_sent, false) = false
);

-- PRODUCT REVIEWS: restrictive INSERT (no self-approval)
DROP POLICY IF EXISTS "reviews_insert_unapproved" ON public.product_reviews;
CREATE POLICY "reviews_insert_unapproved"
ON public.product_reviews
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(is_approved, false) = false
);

-- PRODUCT REVIEWS: guard UPDATE to prevent changing user_id / is_approved by non-admins (trigger-based, since RLS cannot compare OLD/NEW)
CREATE OR REPLACE FUNCTION public.product_reviews_user_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed';
  END IF;
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'is_approved can only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_reviews_user_update_guard ON public.product_reviews;
CREATE TRIGGER product_reviews_user_update_guard
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.product_reviews_user_update_guard();

-- WALLET TOPUPS: restrict admin-review fields on customer INSERT
DROP POLICY IF EXISTS "wallet_topups_insert_safe_fields" ON public.wallet_topups;
CREATE POLICY "wallet_topups_insert_safe_fields"
ON public.wallet_topups
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_note IS NULL
);
