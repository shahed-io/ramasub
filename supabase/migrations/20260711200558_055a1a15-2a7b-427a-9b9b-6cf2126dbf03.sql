
-- 1. Remove overly-broad public SELECT policy on base table
DROP POLICY IF EXISTS "Public view winner rows (safe cols only)" ON public.offer_submissions;

-- 2. Safe public view with only display-safe columns
CREATE OR REPLACE VIEW public.offer_winners_public
WITH (security_invoker = off) AS
SELECT s.id, s.campaign_id, s.name, s.winner_rank, s.ai_reason, s.created_at
FROM public.offer_submissions s
JOIN public.offer_campaigns c ON c.id = s.campaign_id
WHERE s.is_winner = true
  AND c.show_winners_publicly = true
  AND c.status = 'ended';

GRANT SELECT ON public.offer_winners_public TO anon, authenticated;

-- 3. Safe dedupe check via security-definer function (no row/column exposure)
CREATE OR REPLACE FUNCTION public.check_offer_email_submitted(_campaign_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offer_submissions
    WHERE campaign_id = _campaign_id
      AND lower(email) = lower(_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_offer_email_submitted(uuid, text) TO anon, authenticated;
