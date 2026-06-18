
DROP POLICY IF EXISTS "wallets no client writes" ON public.wallets;
CREATE POLICY "wallets no client writes" ON public.wallets
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "wallet_transactions no client insert" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions no client insert" ON public.wallet_transactions
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "wallet_transactions no client update" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions no client update" ON public.wallet_transactions
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "wallet_transactions no client delete" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions no client delete" ON public.wallet_transactions
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "admin_otp_codes no client insert" ON public.admin_otp_codes;
CREATE POLICY "admin_otp_codes no client insert" ON public.admin_otp_codes
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "admin_otp_codes no client update" ON public.admin_otp_codes;
CREATE POLICY "admin_otp_codes no client update" ON public.admin_otp_codes
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admin_otp_codes no client delete" ON public.admin_otp_codes;
CREATE POLICY "admin_otp_codes no client delete" ON public.admin_otp_codes
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);
