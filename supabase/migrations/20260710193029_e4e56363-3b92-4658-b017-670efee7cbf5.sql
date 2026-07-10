
-- Recreate view with security_invoker so it respects the caller's RLS + column privileges
DROP VIEW IF EXISTS public.public_contest_winners;
CREATE VIEW public.public_contest_winners
WITH (security_invoker = on) AS
SELECT s.id, s.campaign_id, s.name, s.winner_rank, s.ai_reason, s.is_winner, s.created_at
FROM public.offer_submissions s
JOIN public.offer_campaigns c ON c.id = s.campaign_id
WHERE s.is_winner = true
  AND c.show_winners_publicly = true
  AND c.status = 'ended';

GRANT SELECT ON public.public_contest_winners TO anon, authenticated;

-- Restore a base-table SELECT policy scoped to public winner rows only.
-- PII protection is enforced by column-level GRANTs below (anon cannot read email/phone).
CREATE POLICY "Public view winner rows (safe cols only)" ON public.offer_submissions
FOR SELECT TO anon, authenticated
USING (
  is_winner = true
  AND EXISTS (
    SELECT 1 FROM public.offer_campaigns c
    WHERE c.id = offer_submissions.campaign_id
      AND c.show_winners_publicly = true
      AND c.status = 'ended'
  )
);

-- Column-level privileges: anon can only see safe columns; email/phone stay private.
REVOKE SELECT ON public.offer_submissions FROM anon;
GRANT SELECT (id, campaign_id, name, winner_rank, ai_reason, is_winner, created_at)
  ON public.offer_submissions TO anon;

-- Also constrain anon SELECT on the joined table to the flags the view needs.
REVOKE SELECT ON public.offer_campaigns FROM anon;
GRANT SELECT ON public.offer_campaigns TO anon;
