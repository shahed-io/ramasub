UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE lower(email) = 'ramasubofficialweb@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'ramasubofficialweb@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;