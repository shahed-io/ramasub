CREATE OR REPLACE FUNCTION public.admin_spend_wallet(
  _user_id uuid,
  _amount numeric,
  _ref_order uuid DEFAULT NULL,
  _reason text DEFAULT 'Order payment'
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  RETURN public._wallet_apply(_user_id, -_amount, 'spend'::public.wallet_txn_type, _reason, _ref_order, NULL, _user_id);
END $$;

REVOKE ALL ON FUNCTION public.admin_spend_wallet(uuid,numeric,uuid,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_spend_wallet(uuid,numeric,uuid,text) TO service_role;