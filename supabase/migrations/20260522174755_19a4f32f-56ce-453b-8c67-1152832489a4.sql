UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

DROP POLICY IF EXISTS "Public can view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users update own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users view own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete payment screenshots" ON storage.objects;

CREATE POLICY "Users view own payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins view payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users upload own payment screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own payment screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own payment screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins delete payment screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-screenshots' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit reports" ON public.accessibility_reports;
CREATE POLICY "Authenticated users submit reports"
ON public.accessibility_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

DROP POLICY IF EXISTS "Only admins write roles (restrictive)" ON public.user_roles;
CREATE POLICY "Only admins write roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));