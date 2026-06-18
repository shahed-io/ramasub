INSERT INTO public.admin_records (kind, data, is_active, sort_order)
VALUES
  ('theme_config', '{"id":"aurora","name":"Aurora","description":"Premium dark glass with violet · cyan · pink aurora"}'::jsonb, true, 1),
  ('theme_config', '{"id":"white","name":"White","description":"Clean light theme — bright surfaces, soft shadows"}'::jsonb, true, 2)
ON CONFLICT DO NOTHING;