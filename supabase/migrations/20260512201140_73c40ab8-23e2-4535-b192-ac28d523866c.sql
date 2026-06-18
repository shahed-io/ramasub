DROP POLICY IF EXISTS "Public read admin-uploads" ON storage.objects;
CREATE POLICY "Admins list admin-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-uploads' AND has_role(auth.uid(), 'admin'::app_role));