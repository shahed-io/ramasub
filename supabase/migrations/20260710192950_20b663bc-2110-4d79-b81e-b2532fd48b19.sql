
-- Fix 1: enforce user_id ownership on INSERT
DROP POLICY IF EXISTS "Anyone can submit" ON public.offer_submissions;
CREATE POLICY "Anyone can submit" ON public.offer_submissions
FOR INSERT TO anon, authenticated
WITH CHECK (
  (COALESCE(is_winner, false) = false)
  AND winner_rank IS NULL
  AND ai_score IS NULL
  AND ai_reason IS NULL
  AND notified_at IS NULL
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
  )
);

-- Fix 2: stop exposing PII (email/phone) via public winners policy.
-- Drop the public SELECT policy on the base table and expose a safe view instead.
DROP POLICY IF EXISTS "Public view winners of show_winners_publicly campaigns" ON public.offer_submissions;

CREATE OR REPLACE VIEW public.public_contest_winners
WITH (security_invoker = off) AS
SELECT s.id, s.campaign_id, s.name, s.winner_rank, s.ai_reason, s.is_winner, s.created_at
FROM public.offer_submissions s
JOIN public.offer_campaigns c ON c.id = s.campaign_id
WHERE s.is_winner = true
  AND c.show_winners_publicly = true
  AND c.status = 'ended';

GRANT SELECT ON public.public_contest_winners TO anon, authenticated;
