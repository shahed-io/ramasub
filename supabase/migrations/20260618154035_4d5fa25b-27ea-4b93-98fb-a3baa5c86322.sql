CREATE TABLE public.tracking_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text,
  pixel_id text,
  access_token text,
  account_id text,
  conversion_label text,
  enabled boolean NOT NULL DEFAULT true,
  events_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_script text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tracking_pixels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_pixels TO authenticated;
GRANT ALL ON public.tracking_pixels TO service_role;

CREATE INDEX idx_tracking_pixels_provider ON public.tracking_pixels(provider, enabled);

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Public read of enabled pixels (so scripts can load on public site)
-- But sensitive fields like access_token are not selected on the client side
CREATE POLICY "Anyone can read enabled tracking pixels"
  ON public.tracking_pixels FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins manage tracking pixels"
  ON public.tracking_pixels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER touch_tracking_pixels_updated_at
  BEFORE UPDATE ON public.tracking_pixels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Server-side event log for CAPI / conversion debugging
CREATE TABLE public.tracking_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tracking_events_log TO authenticated;
GRANT ALL ON public.tracking_events_log TO service_role;

CREATE INDEX idx_tracking_events_log_created ON public.tracking_events_log(created_at DESC);

ALTER TABLE public.tracking_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tracking event log"
  ON public.tracking_events_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role inserts event log"
  ON public.tracking_events_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));