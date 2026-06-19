
-- 1) Update master admin email in handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'ramasubofficialweb@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Wipe all existing users (cascades to profiles, user_roles, wallets, orders via FKs where defined)
DELETE FROM public.user_roles;
DELETE FROM public.wallet_transactions;
DELETE FROM public.wallet_topups;
DELETE FROM public.wallets;
DELETE FROM public.notifications;
DELETE FROM public.profiles;
DELETE FROM auth.users;
