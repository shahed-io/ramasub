
-- Restrict coupon enumeration: only admins can read the full list.
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

CREATE POLICY "Admins can view coupons"
ON public.coupons FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public, code-specific validator. Returns the computed discount for a
-- given code + subtotal without exposing the coupon catalogue.
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
RETURNS TABLE (
  valid boolean,
  code text,
  label text,
  discount numeric,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  v_discount numeric := 0;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN QUERY SELECT false, ''::text, ''::text, 0::numeric, 'Invalid code'::text;
    RETURN;
  END IF;

  SELECT * INTO c FROM public.coupons WHERE code = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, upper(trim(_code)), ''::text, 0::numeric, 'Invalid code'::text;
    RETURN;
  END IF;

  IF c.is_active IS NOT TRUE THEN
    RETURN QUERY SELECT false, c.code, COALESCE(c.description,''), 0::numeric, 'Inactive'::text; RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    RETURN QUERY SELECT false, c.code, COALESCE(c.description,''), 0::numeric, 'Not started yet'::text; RETURN;
  END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    RETURN QUERY SELECT false, c.code, COALESCE(c.description,''), 0::numeric, 'Expired'::text; RETURN;
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN QUERY SELECT false, c.code, COALESCE(c.description,''), 0::numeric, 'Usage limit reached'::text; RETURN;
  END IF;
  IF _subtotal < COALESCE(c.min_subtotal, 0) THEN
    RETURN QUERY SELECT false, c.code, COALESCE(c.description,''), 0::numeric,
      ('Minimum order ৳' || COALESCE(c.min_subtotal,0)::text)::text; RETURN;
  END IF;

  IF c.type = 'percent' THEN
    v_discount := round((_subtotal * c.value) / 100);
  ELSE
    v_discount := LEAST(c.value, _subtotal);
  END IF;
  IF c.max_discount IS NOT NULL THEN
    v_discount := LEAST(v_discount, c.max_discount);
  END IF;
  v_discount := LEAST(v_discount, _subtotal);

  RETURN QUERY SELECT true, c.code, COALESCE(NULLIF(c.description,''), c.code), v_discount, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;
