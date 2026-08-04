-- Back to a security_invoker view (no definer bypass)
ALTER VIEW public.offer_winners_public SET (security_invoker = on);

-- Row filter: only winning rows of ended, publicly-shown campaigns
CREATE POLICY "Public view winner rows (safe cols only)"
ON public.offer_submissions
FOR SELECT
TO anon
USING (
  is_winner = true
  AND EXISTS (
    SELECT 1 FROM public.offer_campaigns c
    WHERE c.id = offer_submissions.campaign_id
      AND c.show_winners_publicly = true
      AND c.status = 'ended'
  )
);

-- Column filter: anon may only ever read non-PII columns
REVOKE SELECT ON public.offer_submissions FROM anon;
GRANT SELECT (id, campaign_id, name, winner_rank, ai_reason, created_at)
  ON public.offer_submissions TO anon;
GRANT SELECT ON public.offer_winners_public TO anon, authenticated;