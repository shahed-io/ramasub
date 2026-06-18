
-- =========================
-- WALLET SYSTEM
-- =========================

-- Transaction type enum
DO $$ BEGIN
  CREATE TYPE public.wallet_txn_type AS ENUM (
    'topup','refund','cashback','referral','spend','adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_topup_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- wallets ----------
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets self read" ON public.wallets;
CREATE POLICY "wallets self read" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- No client writes; balance only changes via SECURITY DEFINER functions.

-- ---------- wallet_transactions ----------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        numeric(12,2) NOT NULL,           -- signed: + credit, - debit
  type          public.wallet_txn_type NOT NULL,
  reason        text,
  ref_order_id  uuid,
  ref_topup_id  uuid,
  balance_after numeric(12,2) NOT NULL,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_tx_user_idx    ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_tx_type_idx    ON public.wallet_transactions(type);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet tx self read" ON public.wallet_transactions;
CREATE POLICY "wallet tx self read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- wallet_topups ----------
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  method          text NOT NULL,                  -- bkash | nagad | other
  sender_number   text,
  txn_id          text,
  screenshot_path text,                            -- path in payment-screenshots bucket
  note            text,
  status          public.wallet_topup_status NOT NULL DEFAULT 'pending',
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  admin_note      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_topups_user_idx   ON public.wallet_topups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_topups_status_idx ON public.wallet_topups(status, created_at DESC);
GRANT SELECT, INSERT ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topups self read"   ON public.wallet_topups;
DROP POLICY IF EXISTS "topups self insert" ON public.wallet_topups;
DROP POLICY IF EXISTS "topups admin all"   ON public.wallet_topups;

CREATE POLICY "topups self read" ON public.wallet_topups FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "topups self insert" ON public.wallet_topups FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND amount > 0
  );

CREATE POLICY "topups admin all" ON public.wallet_topups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS wallet_topups_touch ON public.wallet_topups;
CREATE TRIGGER wallet_topups_touch BEFORE UPDATE ON public.wallet_topups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- FUNCTIONS
-- =========================

-- internal credit/debit (used by the named RPCs below)
CREATE OR REPLACE FUNCTION public._wallet_apply(
  _user_id uuid, _delta numeric, _type public.wallet_txn_type,
  _reason text, _ref_order uuid, _ref_topup uuid, _created_by uuid
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_balance numeric(12,2);
  v_tx public.wallet_transactions;
BEGIN
  IF _delta = 0 THEN RAISE EXCEPTION 'amount must not be zero'; END IF;

  INSERT INTO public.wallets(user_id, balance) VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
     SET balance = balance + _delta, updated_at = now()
   WHERE user_id = _user_id
   RETURNING balance INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient wallet balance';
  END IF;

  INSERT INTO public.wallet_transactions(
    user_id, amount, type, reason, ref_order_id, ref_topup_id, balance_after, created_by
  ) VALUES (
    _user_id, _delta, _type, _reason, _ref_order, _ref_topup, v_new_balance, _created_by
  ) RETURNING * INTO v_tx;

  RETURN v_tx;
END $$;
REVOKE ALL ON FUNCTION public._wallet_apply(uuid,numeric,public.wallet_txn_type,text,uuid,uuid,uuid) FROM public, anon, authenticated;

-- approve top-up (admin only)
CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.wallet_topups%ROWTYPE;
  v_tx public.wallet_transactions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO t FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'top-up not found'; END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'top-up already %', t.status; END IF;

  v_tx := public._wallet_apply(
    t.user_id, t.amount, 'topup', COALESCE(_admin_note,'Top-up approved'), NULL, t.id, auth.uid()
  );

  UPDATE public.wallet_topups
     SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(),
         admin_note=COALESCE(_admin_note, admin_note)
   WHERE id = _topup_id;

  RETURN v_tx;
END $$;
REVOKE ALL ON FUNCTION public.approve_wallet_topup(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_wallet_topup(uuid,text) TO authenticated;

-- reject top-up (admin only)
CREATE OR REPLACE FUNCTION public.reject_wallet_topup(_topup_id uuid, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.wallet_topups
     SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(),
         admin_note=COALESCE(_admin_note, admin_note)
   WHERE id=_topup_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'top-up not found or already reviewed'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.reject_wallet_topup(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reject_wallet_topup(uuid,text) TO authenticated;

-- admin manual credit/debit
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  _user_id uuid, _amount numeric, _reason text
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  RETURN public._wallet_apply(_user_id, _amount, 'adjustment', _reason, NULL, NULL, auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid,numeric,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid,numeric,text) TO authenticated;

-- admin: credit refund/cashback/referral
CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  _user_id uuid, _amount numeric, _type public.wallet_txn_type,
  _reason text, _ref_order uuid DEFAULT NULL
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF _type NOT IN ('refund','cashback','referral','adjustment') THEN
    RAISE EXCEPTION 'invalid type for admin credit';
  END IF;
  RETURN public._wallet_apply(_user_id, _amount, _type, _reason, _ref_order, NULL, auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.admin_credit_wallet(uuid,numeric,public.wallet_txn_type,text,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(uuid,numeric,public.wallet_txn_type,text,uuid) TO authenticated;

-- user: spend wallet on an order (only their own user_id)
CREATE OR REPLACE FUNCTION public.spend_wallet(_amount numeric, _ref_order uuid DEFAULT NULL, _reason text DEFAULT 'Order payment')
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  RETURN public._wallet_apply(v_uid, -_amount, 'spend', _reason, _ref_order, NULL, v_uid);
END $$;
REVOKE ALL ON FUNCTION public.spend_wallet(numeric,uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spend_wallet(numeric,uuid,text) TO authenticated;

-- ensure every new user has a wallet row (free join in admin lists)
CREATE OR REPLACE FUNCTION public._ensure_wallet_for_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id, balance) VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wallet_on_new_profile ON public.profiles;
CREATE TRIGGER wallet_on_new_profile AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._ensure_wallet_for_new_user();

-- backfill wallets for existing users
INSERT INTO public.wallets(user_id, balance)
SELECT id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
