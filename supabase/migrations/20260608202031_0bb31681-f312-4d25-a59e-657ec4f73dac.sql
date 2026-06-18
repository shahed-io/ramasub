
-- 1) user_roles: add restrictive policy covering ALL roles (incl. anon) for writes
DROP POLICY IF EXISTS "Block anon writes on user_roles" ON public.user_roles;
CREATE POLICY "Block anon writes on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) accessibility_reports: enforce user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Authenticated users submit reports" ON public.accessibility_reports;
CREATE POLICY "Authenticated users submit reports"
ON public.accessibility_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
