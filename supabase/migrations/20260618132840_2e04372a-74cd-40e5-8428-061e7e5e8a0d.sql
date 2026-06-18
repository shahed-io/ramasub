
-- Drop overly-permissive policies on abandoned_checkouts
DROP POLICY IF EXISTS "Anyone can insert abandoned checkouts" ON public.abandoned_checkouts;
DROP POLICY IF EXISTS "Anyone can update abandoned checkouts" ON public.abandoned_checkouts;

-- Only signed-in users can create their own abandoned-checkout row
CREATE POLICY "Users insert own abandoned checkouts"
ON public.abandoned_checkouts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update only their own row, and cannot change ownership
CREATE POLICY "Users update own abandoned checkouts"
ON public.abandoned_checkouts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any row (notes, status, etc.)
CREATE POLICY "Admins update abandoned checkouts"
ON public.abandoned_checkouts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Support upsert by user_id from the checkout page
CREATE UNIQUE INDEX IF NOT EXISTS abandoned_checkouts_user_id_key
  ON public.abandoned_checkouts(user_id)
  WHERE user_id IS NOT NULL;
