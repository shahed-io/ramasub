DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);