-- ============================================================
-- Meta Business Integration — Phase 1 schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------- Main config (singleton) ---------
CREATE TABLE public.meta_business_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  -- Section 1
  pixel_id text,
  dataset_id text,
  access_token_encrypted bytea,
  access_token_last4 text,
  test_event_code text,
  graph_api_version text NOT NULL DEFAULT 'v21.0',
  -- Section 2 — Pixel installation toggles
  enable_pixel boolean NOT NULL DEFAULT false,
  auto_inject boolean NOT NULL DEFAULT true,
  load_in_head boolean NOT NULL DEFAULT true,
  load_after_consent boolean NOT NULL DEFAULT false,
  advanced_matching boolean NOT NULL DEFAULT true,
  auto_pageview boolean NOT NULL DEFAULT true,
  spa_nav boolean NOT NULL DEFAULT true,
  wc_detect boolean NOT NULL DEFAULT true,
  debug_mode boolean NOT NULL DEFAULT false,
  -- Section 3 — CAPI
  capi_enabled boolean NOT NULL DEFAULT false,
  capi_endpoint text,
  capi_timeout_ms integer NOT NULL DEFAULT 8000,
  capi_max_retry integer NOT NULL DEFAULT 3,
  capi_retry_failed boolean NOT NULL DEFAULT true,
  capi_queue_failed boolean NOT NULL DEFAULT true,
  -- Section 15 — Consent
  consent_gdpr boolean NOT NULL DEFAULT false,
  consent_ccpa boolean NOT NULL DEFAULT false,
  consent_region_detect boolean NOT NULL DEFAULT false,
  -- Diagnostics/state
  last_verified_at timestamptz,
  last_verify_result jsonb,
  last_event_at timestamptz,
  event_match_quality numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_business_config_singleton_key UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_business_config TO authenticated;
GRANT ALL ON public.meta_business_config TO service_role;

ALTER TABLE public.meta_business_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta config" ON public.meta_business_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER meta_business_config_updated_at
  BEFORE UPDATE ON public.meta_business_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the singleton row so save UPDATE always finds it
INSERT INTO public.meta_business_config (id) VALUES (gen_random_uuid())
  ON CONFLICT (singleton) DO NOTHING;

-- --------- Advanced Matching config (singleton via jsonb) ---------
CREATE TABLE public.meta_advanced_matching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL DEFAULT '{
    "email": true, "phone": true, "first_name": true, "last_name": true,
    "city": true, "country": true, "zip": true, "state": true,
    "external_id": true, "client_ip": true, "user_agent": true,
    "fbc": true, "fbp": true
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_advanced_matching_singleton_key UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_advanced_matching TO authenticated;
GRANT ALL ON public.meta_advanced_matching TO service_role;
ALTER TABLE public.meta_advanced_matching ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meta AM" ON public.meta_advanced_matching
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER meta_advanced_matching_updated_at
  BEFORE UPDATE ON public.meta_advanced_matching
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.meta_advanced_matching (id) VALUES (gen_random_uuid())
  ON CONFLICT (singleton) DO NOTHING;

-- --------- Standard events catalog ---------
CREATE TABLE public.meta_standard_events (
  event_name text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  browser boolean NOT NULL DEFAULT true,
  server boolean NOT NULL DEFAULT false,
  dedupe boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_standard_events TO authenticated;
GRANT ALL ON public.meta_standard_events TO service_role;
ALTER TABLE public.meta_standard_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meta std events" ON public.meta_standard_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER meta_standard_events_updated_at
  BEFORE UPDATE ON public.meta_standard_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.meta_standard_events (event_name, enabled, browser, server, dedupe, priority) VALUES
  ('PageView', true, true, false, true, 1),
  ('ViewContent', true, true, true, true, 2),
  ('Search', true, true, false, true, 3),
  ('AddToCart', true, true, true, true, 2),
  ('AddToWishlist', true, true, false, true, 4),
  ('InitiateCheckout', true, true, true, true, 2),
  ('AddPaymentInfo', true, true, true, true, 2),
  ('Purchase', true, true, true, true, 1),
  ('Lead', true, true, true, true, 2),
  ('Contact', false, true, true, true, 5),
  ('CompleteRegistration', true, true, true, true, 3),
  ('Subscribe', false, true, true, true, 4),
  ('StartTrial', false, true, true, true, 4),
  ('SubmitApplication', false, true, true, true, 5),
  ('Schedule', false, true, false, true, 5),
  ('Donate', false, true, true, true, 5),
  ('FindLocation', false, true, false, true, 5),
  ('CustomizeProduct', false, true, false, true, 5),
  ('AddShippingInfo', true, true, true, true, 3)
  ON CONFLICT (event_name) DO NOTHING;

-- --------- Custom events ---------
CREATE TABLE public.meta_custom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('url','button','css','js')),
  trigger_value text NOT NULL,
  browser boolean NOT NULL DEFAULT true,
  server boolean NOT NULL DEFAULT false,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_custom_events TO authenticated;
GRANT ALL ON public.meta_custom_events TO service_role;
ALTER TABLE public.meta_custom_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meta custom events" ON public.meta_custom_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER meta_custom_events_updated_at
  BEFORE UPDATE ON public.meta_custom_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------- Event logs ---------
CREATE TABLE public.meta_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('browser','server')),
  status text NOT NULL CHECK (status IN ('success','failed','pending','retrying')),
  http_code integer,
  latency_ms integer,
  response jsonb,
  retry_count integer NOT NULL DEFAULT 0,
  order_id uuid,
  customer_id uuid,
  event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meta_event_logs_created_idx ON public.meta_event_logs(created_at DESC);
CREATE INDEX meta_event_logs_event_idx ON public.meta_event_logs(event_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_event_logs TO authenticated;
GRANT ALL ON public.meta_event_logs TO service_role;
ALTER TABLE public.meta_event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view meta logs" ON public.meta_event_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete meta logs" ON public.meta_event_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- --------- CAPI retry queue ---------
CREATE TABLE public.meta_capi_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','dead')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meta_capi_queue_next_idx ON public.meta_capi_queue(status, next_attempt_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_capi_queue TO authenticated;
GRANT ALL ON public.meta_capi_queue TO service_role;
ALTER TABLE public.meta_capi_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meta queue" ON public.meta_capi_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER meta_capi_queue_updated_at
  BEFORE UPDATE ON public.meta_capi_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();