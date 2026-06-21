GRANT SELECT ON public.promotions TO anon;
CREATE POLICY "Anon can view active promotions"
ON public.promotions FOR SELECT
TO anon
USING (is_active = true);