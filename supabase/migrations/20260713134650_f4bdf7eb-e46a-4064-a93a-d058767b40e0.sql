
CREATE TABLE IF NOT EXISTS public.web_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  visitor_id text,
  path text NOT NULL,
  full_url text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  country text,
  country_name text,
  city text,
  region text,
  device text,
  browser text,
  os text,
  user_agent text,
  screen_size text,
  language text,
  is_new_session boolean DEFAULT false,
  is_new_visitor boolean DEFAULT false,
  duration_ms integer,
  user_id uuid,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wae_created ON public.web_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wae_country ON public.web_analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_wae_path ON public.web_analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_wae_session ON public.web_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_wae_ref_host ON public.web_analytics_events(referrer_host);

GRANT SELECT ON public.web_analytics_events TO authenticated;
GRANT ALL ON public.web_analytics_events TO service_role;

ALTER TABLE public.web_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read web analytics"
  ON public.web_analytics_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role manages web analytics"
  ON public.web_analytics_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
