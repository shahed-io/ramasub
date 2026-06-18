INSERT INTO public.admin_records (kind, data, is_active, sort_order)
VALUES ('theme_default', '{"id":"white"}'::jsonb, true, 0)
ON CONFLICT DO NOTHING;