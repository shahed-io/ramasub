-- Ensure has_role(_user_id uuid, _role app_role) is callable by both
-- authenticated and anonymous JWT roles via PostgREST RPC.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Verification: fail loudly if the grants are missing or the function signature
-- changed. This block runs inside the migration and aborts on regression.
DO $$
DECLARE
  fn_oid oid;
  missing text[] := ARRAY[]::text[];
  r text;
BEGIN
  SELECT p.oid INTO fn_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'has_role'
    AND pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role';

  IF fn_oid IS NULL THEN
    RAISE EXCEPTION 'verification failed: public.has_role(uuid, app_role) not found';
  END IF;

  FOREACH r IN ARRAY ARRAY['authenticated', 'anon'] LOOP
    IF NOT has_function_privilege(r, fn_oid, 'EXECUTE') THEN
      missing := array_append(missing, r);
    END IF;
  END LOOP;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'verification failed: EXECUTE on has_role missing for: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'verification passed: has_role EXECUTE granted to authenticated, anon';
END $$;

-- Persistent verification view — query any time to inspect the grants:
--   SELECT * FROM public.v_has_role_permissions;
CREATE OR REPLACE VIEW public.v_has_role_permissions AS
SELECT
  r.rolname AS grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute,
  pg_get_function_identity_arguments(p.oid) AS signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('authenticated'), ('anon'), ('service_role'), ('public')) AS r(rolname)
WHERE n.nspname = 'public'
  AND p.proname = 'has_role'
  AND pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role';

GRANT SELECT ON public.v_has_role_permissions TO authenticated, anon;