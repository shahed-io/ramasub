DO $$
DECLARE
  expected_args CONSTANT text := '_user_id uuid, _role app_role';
  actual_args   text;
  fn_count      int;
BEGIN
  SELECT count(*) INTO fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'has_role';

  IF fn_count = 0 THEN
    RAISE EXCEPTION
      'has_role signature check FAILED: public.has_role(...) does not exist.';
  ELSIF fn_count > 1 THEN
    RAISE EXCEPTION
      'has_role signature check FAILED: expected exactly 1 overload of public.has_role, found %.', fn_count;
  END IF;

  SELECT pg_get_function_identity_arguments(p.oid) INTO actual_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'has_role';

  IF actual_args IS DISTINCT FROM expected_args THEN
    RAISE EXCEPTION
      'has_role signature check FAILED: expected (%), got (%). RLS policies depend on this exact signature — do not rename parameters or change types.',
      expected_args, actual_args;
  END IF;

  RAISE NOTICE 'has_role signature OK: public.has_role(%)', actual_args;
END
$$;