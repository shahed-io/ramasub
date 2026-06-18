
DROP POLICY IF EXISTS "Visitors insert own chat messages" ON public.live_chat_messages;

CREATE POLICY "Visitors insert own chat messages"
ON public.live_chat_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(session_id) BETWEEN 8 AND 128
  AND length(content) BETWEEN 1 AND 4000
  AND (visitor_label IS NULL OR length(visitor_label) <= 120)
  AND role IN ('user','assistant','admin')
  AND (
    -- Admin replies require admin role
    (role = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role))
    OR
    -- Anonymous visitor or assistant log from an unauthenticated browser
    (auth.uid() IS NULL AND role IN ('user','assistant') AND user_id IS NULL)
    OR
    -- Signed-in visitor: must claim their own user id
    (auth.uid() IS NOT NULL AND role IN ('user','assistant') AND user_id = auth.uid())
  )
);
