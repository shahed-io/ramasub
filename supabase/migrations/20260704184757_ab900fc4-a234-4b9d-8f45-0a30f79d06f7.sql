
-- accessibility_reports
DROP POLICY IF EXISTS "Admins delete reports" ON public.accessibility_reports;
CREATE POLICY "Admins delete reports" ON public.accessibility_reports FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins update reports" ON public.accessibility_reports;
CREATE POLICY "Admins update reports" ON public.accessibility_reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins view all reports" ON public.accessibility_reports;
CREATE POLICY "Admins view all reports" ON public.accessibility_reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own reports" ON public.accessibility_reports;
CREATE POLICY "Users view own reports" ON public.accessibility_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "Admins delete notifications" ON public.notifications;
CREATE POLICY "Admins delete notifications" ON public.notifications FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins view all notifications" ON public.notifications;
CREATE POLICY "Admins view all notifications" ON public.notifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- orders
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- product_reviews
DROP POLICY IF EXISTS "Admins manage reviews" ON public.product_reviews;
CREATE POLICY "Admins manage reviews" ON public.product_reviews FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- SELECT approved reviews stays public (anonymous product page)
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT TO anon, authenticated USING ((is_approved = true) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users update own reviews" ON public.product_reviews;
CREATE POLICY "Users update own reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- support_tickets
DROP POLICY IF EXISTS "Admins delete tickets" ON public.support_tickets;
CREATE POLICY "Admins delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins update tickets" ON public.support_tickets;
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins view all tickets" ON public.support_tickets;
CREATE POLICY "Admins view all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- team_members
DROP POLICY IF EXISTS "Admins manage team" ON public.team_members;
CREATE POLICY "Admins manage team" ON public.team_members FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- offer_submissions: keep anonymous INSERT allowed, but forbid setting moderation fields
DROP POLICY IF EXISTS "Anyone can submit" ON public.offer_submissions;
CREATE POLICY "Anyone can submit" ON public.offer_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    COALESCE(is_winner, false) = false
    AND winner_rank IS NULL
    AND ai_score IS NULL
    AND ai_reason IS NULL
    AND notified_at IS NULL
  );

-- telegram_notifications_log: restrict to server (service_role bypasses RLS; no anon inserts)
DROP POLICY IF EXISTS "System inserts telegram log" ON public.telegram_notifications_log;
CREATE POLICY "System inserts telegram log" ON public.telegram_notifications_log FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
