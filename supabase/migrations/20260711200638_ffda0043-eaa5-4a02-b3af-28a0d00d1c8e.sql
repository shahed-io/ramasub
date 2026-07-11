
-- Recreate view as security-invoker so linter is happy
DROP VIEW IF EXISTS public.offer_winners_public;
CREATE VIEW public.offer_winners_public
WITH (security_invoker = on) AS
SELECT s.id, s.campaign_id, s.name, s.winner_rank, s.ai_reason, s.created_at
FROM public.offer_submissions s
JOIN public.offer_campaigns c ON c.id = s.campaign_id
WHERE s.is_winner = true
  AND c.show_winners_publicly = true
  AND c.status = 'ended';

GRANT SELECT ON public.offer_winners_public TO anon, authenticated;

-- Column-level grants: anon can only read safe columns from base table
REVOKE SELECT ON public.offer_submissions FROM anon;
GRANT SELECT (id, campaign_id, name, winner_rank, ai_reason, created_at)
  ON public.offer_submissions TO anon;

-- Narrow RLS policy for public winner rows (safe cols enforced by grant)
CREATE POLICY "Public view winner rows (safe cols only)"
ON public.offer_submissions FOR SELECT
TO anon, authenticated
USING (
  is_winner = true AND EXISTS (
    SELECT 1 FROM public.offer_campaigns c
    WHERE c.id = offer_submissions.campaign_id
      AND c.show_winners_publicly = true
      AND c.status = 'ended'
  )
);
