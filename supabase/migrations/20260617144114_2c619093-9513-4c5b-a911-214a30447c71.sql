DROP POLICY IF EXISTS "Reviews require authenticated user_id" ON public.product_reviews;
CREATE POLICY "Reviews require authenticated user_id"
ON public.product_reviews
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);