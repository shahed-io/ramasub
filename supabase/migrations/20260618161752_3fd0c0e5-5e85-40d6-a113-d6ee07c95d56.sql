
-- 1) Remove ticket_messages from Realtime publication.
-- App reads ticket messages via standard queries; no client subscribes to
-- postgres_changes for this table. Publishing it without realtime.messages
-- RLS lets any authenticated user subscribe and stream other users' messages.
ALTER PUBLICATION supabase_realtime DROP TABLE public.ticket_messages;

-- 2) Tighten live_chat_messages INSERT policy.
-- Old policy: WITH CHECK (true) — anyone could spoof session_id / role /
-- visitor_label and inject messages into any session.
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.live_chat_messages;

CREATE POLICY "Visitors insert own chat messages"
ON public.live_chat_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Basic shape / length guards to prevent abuse
  length(session_id) BETWEEN 8 AND 128
  AND length(content) BETWEEN 1 AND 4000
  AND (visitor_label IS NULL OR length(visitor_label) <= 80)
  AND (
    -- Anonymous visitors may only send as the 'user' role and must not
    -- claim ownership of any auth account.
    (auth.uid() IS NULL AND role = 'user' AND user_id IS NULL)
    OR
    -- Signed-in visitors send as 'user' and must be themselves.
    (auth.uid() IS NOT NULL AND role = 'user' AND user_id = auth.uid())
    OR
    -- Admins may reply as 'admin'.
    (role = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

-- 3) Tighten newsletter_subscribers INSERT policy.
-- Old policy let anon insert any email with status='active', enabling
-- mass-subscribing arbitrary addresses. Require double-opt-in: anon
-- subscriptions must start as 'pending' and pass basic email validation;
-- a separate confirmation flow (admin or token-based) can promote to 'active'.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Public can request subscription"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(email) BETWEEN 3 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (name IS NULL OR length(name) <= 120)
  AND (
    -- Anonymous signups must enter the pending queue (double opt-in).
    (auth.uid() IS NULL AND status = 'pending')
    OR
    -- Signed-in users may subscribe themselves directly.
    (auth.uid() IS NOT NULL AND status IN ('pending','active'))
  )
);
