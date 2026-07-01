
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_existing uuid;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  v_code := lower(trim(coalesce(_code, '')));
  IF length(v_code) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  -- Ensure caller has a profile row
  INSERT INTO public.profiles(id) VALUES (v_uid) ON CONFLICT (id) DO NOTHING;

  SELECT referred_by INTO v_existing FROM public.profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  SELECT id INTO v_referrer
  FROM public.profiles
  WHERE lower(substr(id::text, 1, length(v_code))) = v_code
  LIMIT 1;

  IF v_referrer IS NULL OR v_referrer = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_not_found');
  END IF;

  UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_uid AND referred_by IS NULL;

  -- Credit the referrer ৳50
  PERFORM public._wallet_apply(v_referrer, 50, 'referral'::public.wallet_txn_type,
    'Referral bonus: নতুন signup', NULL, NULL, v_uid);

  RETURN jsonb_build_object('ok', true, 'referrer', v_referrer);
END $$;

REVOKE ALL ON FUNCTION public.redeem_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;
