DROP POLICY IF EXISTS "Public view winner rows (safe cols only)" ON public.offer_submissions;

ALTER VIEW public.offer_winners_public SET (security_invoker = off);

GRANT SELECT ON public.offer_winners_public TO anon, authenticated;