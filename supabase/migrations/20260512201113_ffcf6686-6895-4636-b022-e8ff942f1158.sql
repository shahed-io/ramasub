-- 1) Lock down team_members SELECT to admins only
DROP POLICY IF EXISTS "Anyone can view active team" ON public.team_members;
CREATE POLICY "Admins view team"
ON public.team_members FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Restrict notifications UPDATE to only read_status column via trigger
CREATE OR REPLACE FUNCTION public.notifications_user_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Regular owners may only modify read_status
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.link IS DISTINCT FROM OLD.link
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_status may be updated on your notifications';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_user_update_guard ON public.notifications;
CREATE TRIGGER trg_notifications_user_update_guard
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_user_update_guard();

-- 3) Revoke direct EXECUTE on internal SECURITY DEFINER functions from API roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;