
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior version of the job
DO $$
BEGIN
  PERFORM cron.unschedule('rama-autogen-blogs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Store the shared secret in a settings row so it can be updated without redeploying.
-- The secret matches process.env.BLOG_AUTOGEN_SECRET on the server.
INSERT INTO public.admin_records (kind, data, is_active)
SELECT 'blog_autogen_config',
       jsonb_build_object(
         'endpoint', 'https://project--bvoeflkypmonhbmwfbmx.lovable.app/api/public/generate-blogs',
         'note', 'Set data.secret to match BLOG_AUTOGEN_SECRET env var, then re-run the cron schedule below.'
       ),
       true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_records WHERE kind = 'blog_autogen_config');

-- Schedule: run every hour, generate up to 3 missing product blogs per run
SELECT cron.schedule(
  'rama-autogen-blogs',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := COALESCE(
      (SELECT (data->>'endpoint') FROM public.admin_records WHERE kind = 'blog_autogen_config' ORDER BY created_at LIMIT 1),
      'https://project--bvoeflkypmonhbmwfbmx.lovable.app/api/public/generate-blogs'
    ) || '?limit=3',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Autogen-Secret', COALESCE(
        (SELECT (data->>'secret') FROM public.admin_records WHERE kind = 'blog_autogen_config' ORDER BY created_at LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
