
-- Remove overly broad UPDATE policy on coupons that lets any authenticated
-- user change discount value/code/limits. Replace with a SECURITY DEFINER
-- redemption RPC that only increments used_count.

DROP POLICY IF EXISTS "Users can redeem active coupons" ON public.coupons;

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_used integer;
  v_limit integer;
  v_active boolean;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, used_count, usage_limit, is_active, starts_at, ends_at
    INTO v_id, v_used, v_limit, v_active, v_starts, v_ends
  FROM public.coupons
  WHERE code = upper(trim(_code))
  FOR UPDATE;

  IF v_id IS NULL OR v_active IS NOT TRUE THEN
    RETURN;
  END IF;
  IF v_starts IS NOT NULL AND now() < v_starts THEN RETURN; END IF;
  IF v_ends IS NOT NULL AND now() > v_ends THEN RETURN; END IF;
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN RETURN; END IF;

  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
