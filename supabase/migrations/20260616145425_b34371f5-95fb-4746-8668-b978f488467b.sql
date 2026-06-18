
-- Add restrictive defense-in-depth policies
CREATE POLICY "Restrict team_members to admins" ON public.team_members
  AS RESTRICTIVE FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Restrict coupons direct access to admins" ON public.coupons
  AS RESTRICTIVE FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
