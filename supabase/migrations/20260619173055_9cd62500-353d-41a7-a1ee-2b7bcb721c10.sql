
DROP POLICY IF EXISTS "Visitors insert own chat messages" ON public.live_chat_messages;

CREATE POLICY "Visitors insert own chat messages"
ON public.live_chat_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (
  length(session_id) >= 8 AND length(session_id) <= 128
  AND length(content) >= 1 AND length(content) <= 4000
  AND (visitor_label IS NULL OR length(visitor_label) <= 120)
  AND role = ANY (ARRAY['user'::text, 'assistant'::text, 'admin'::text])
  AND (
    -- Admins may post as admin or assistant
    ((role = 'admin' OR role = 'assistant') AND has_role(auth.uid(), 'admin'::app_role))
    -- Anonymous visitors may only post as 'user'
    OR (auth.uid() IS NULL AND role = 'user' AND user_id IS NULL)
    -- Signed-in non-admins may only post as 'user' for themselves
    OR (auth.uid() IS NOT NULL AND role = 'user' AND user_id = auth.uid())
  )
);
