
-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'flat'
  value NUMERIC NOT NULL DEFAULT 0,
  min_subtotal NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coupons_type_check CHECK (type IN ('percent','flat')),
  CONSTRAINT coupons_value_check CHECK (value >= 0)
);

CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active);

-- Normalize code to uppercase on write
CREATE OR REPLACE FUNCTION public.coupons_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER coupons_normalize_trg
BEFORE INSERT OR UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.coupons_normalize();

CREATE TRIGGER coupons_touch_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Guard so non-admins can only update used_count (for redeem)
CREATE OR REPLACE FUNCTION public.coupons_user_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.value IS DISTINCT FROM OLD.value
     OR NEW.min_subtotal IS DISTINCT FROM OLD.min_subtotal
     OR NEW.max_discount IS DISTINCT FROM OLD.max_discount
     OR NEW.usage_limit IS DISTINCT FROM OLD.usage_limit
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only used_count may be updated on coupons';
  END IF;
  -- Only allow increment by 1
  IF NEW.used_count <> COALESCE(OLD.used_count,0) + 1 THEN
    RAISE EXCEPTION 'used_count may only be incremented by 1';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER coupons_user_update_guard_trg
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.coupons_user_update_guard();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage coupons"
ON public.coupons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active coupons (needed for cart/checkout to validate codes)
CREATE POLICY "Public can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can update only an active coupon (guarded by trigger to used_count +1 only)
CREATE POLICY "Users can redeem active coupons"
ON public.coupons FOR UPDATE
TO authenticated
USING (is_active = true)
WITH CHECK (is_active = true);

-- Seed existing coupons
INSERT INTO public.coupons (code, description, type, value) VALUES
  ('SAVE10', '10% off', 'percent', 10),
  ('SAVE100', '৳100 off', 'flat', 100),
  ('WELCOME50', '৳50 off', 'flat', 50),
  ('ACCESSEID25', 'Eid special ৳150 off', 'flat', 150)
ON CONFLICT (code) DO NOTHING;
