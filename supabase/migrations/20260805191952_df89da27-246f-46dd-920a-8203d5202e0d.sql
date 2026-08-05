-- 1. Rules (configurable thresholds)
CREATE TABLE public.rate_limit_rules (
  key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'public',
  window_seconds integer NOT NULL DEFAULT 60,
  max_requests integer NOT NULL DEFAULT 60,
  backoff_base_seconds integer NOT NULL DEFAULT 0,
  backoff_max_seconds integer NOT NULL DEFAULT 3600,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_rules TO authenticated;
GRANT ALL ON public.rate_limit_rules TO service_role;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rate limit rules" ON public.rate_limit_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_rate_limit_rules_touch BEFORE UPDATE ON public.rate_limit_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Counters (fixed window per rule + identifier)
CREATE TABLE public.rate_limit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, identifier, window_start)
);
CREATE INDEX idx_rate_limit_counters_window ON public.rate_limit_counters (window_start);

GRANT SELECT ON public.rate_limit_counters TO authenticated;
GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate limit counters" ON public.rate_limit_counters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Blocks (exponential backoff state)
CREATE TABLE public.rate_limit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  identifier text NOT NULL,
  strikes integer NOT NULL DEFAULT 0,
  blocked_until timestamptz NOT NULL DEFAULT now(),
  last_violation_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, identifier)
);
CREATE INDEX idx_rate_limit_blocks_until ON public.rate_limit_blocks (blocked_until);

GRANT SELECT, DELETE ON public.rate_limit_blocks TO authenticated;
GRANT ALL ON public.rate_limit_blocks TO service_role;
ALTER TABLE public.rate_limit_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rate limit blocks" ON public.rate_limit_blocks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins clear rate limit blocks" ON public.rate_limit_blocks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_rate_limit_blocks_touch BEFORE UPDATE ON public.rate_limit_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Core check function (service_role only; called from trusted server code)
CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _identifier text, _cost integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.rate_limit_rules;
  b public.rate_limit_blocks;
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_hits integer;
  v_id text := COALESCE(NULLIF(trim(_identifier), ''), 'unknown');
  v_strikes integer;
  v_delay integer;
BEGIN
  SELECT * INTO r FROM public.rate_limit_rules WHERE key = _key;
  IF NOT FOUND OR r.enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_rule');
  END IF;

  SELECT * INTO b FROM public.rate_limit_blocks
    WHERE key = _key AND identifier = v_id FOR UPDATE;

  IF FOUND AND b.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'backoff',
      'retry_after', GREATEST(1, ceil(extract(epoch FROM (b.blocked_until - v_now)))::int),
      'strikes', b.strikes,
      'limit', r.max_requests
    );
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch FROM v_now) / r.window_seconds) * r.window_seconds);

  INSERT INTO public.rate_limit_counters(key, identifier, window_start, hits)
  VALUES (_key, v_id, v_window_start, GREATEST(1, COALESCE(_cost, 1)))
  ON CONFLICT (key, identifier, window_start)
  DO UPDATE SET hits = public.rate_limit_counters.hits + GREATEST(1, COALESCE(_cost, 1)),
                updated_at = v_now
  RETURNING hits INTO v_hits;

  IF v_hits <= r.max_requests THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'ok',
      'limit', r.max_requests,
      'remaining', r.max_requests - v_hits,
      'reset_after', GREATEST(1, ceil(extract(epoch FROM (v_window_start + make_interval(secs => r.window_seconds) - v_now)))::int)
    );
  END IF;

  -- Over the limit: escalate strike + exponential backoff
  IF b.identifier IS NULL OR b.last_violation_at < v_now - make_interval(secs => r.backoff_max_seconds * 2) THEN
    v_strikes := 1;
  ELSE
    v_strikes := b.strikes + 1;
  END IF;

  IF r.backoff_base_seconds > 0 THEN
    v_delay := LEAST(
      r.backoff_max_seconds,
      (r.backoff_base_seconds * power(2, LEAST(v_strikes - 1, 16)))::int
    );
  ELSE
    v_delay := GREATEST(1, ceil(extract(epoch FROM (v_window_start + make_interval(secs => r.window_seconds) - v_now)))::int);
  END IF;

  INSERT INTO public.rate_limit_blocks(key, identifier, strikes, blocked_until, last_violation_at)
  VALUES (_key, v_id, v_strikes, v_now + make_interval(secs => v_delay), v_now)
  ON CONFLICT (key, identifier) DO UPDATE
    SET strikes = v_strikes,
        blocked_until = v_now + make_interval(secs => v_delay),
        last_violation_at = v_now,
        updated_at = v_now;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'rate_limited',
    'retry_after', v_delay,
    'strikes', v_strikes,
    'limit', r.max_requests,
    'remaining', 0
  );
END $$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer) TO service_role;

-- 5. Housekeeping
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '2 days';
  DELETE FROM public.rate_limit_blocks
    WHERE blocked_until < now() - interval '7 days' AND last_violation_at < now() - interval '7 days';
END $$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- 6. Seed default rules (all editable from the admin panel)
INSERT INTO public.rate_limit_rules
  (key, label, category, window_seconds, max_requests, backoff_base_seconds, backoff_max_seconds, notes)
VALUES
  ('auth.login.ip',            'Login (per IP)',                 'auth', 300,  15, 30,  3600,  'Strict: brute-force protection per IP'),
  ('auth.login.account',       'Login (per account)',            'auth', 900,  8,  60,  3600,  'Strict: per email/account with exponential backoff'),
  ('auth.signup.ip',           'Signup (per IP)',                'auth', 3600, 6,  120, 7200,  'Strict: prevents mass account creation'),
  ('auth.reset.ip',            'Password reset (per IP)',        'auth', 3600, 8,  120, 7200,  'Strict'),
  ('auth.reset.account',       'Password reset (per account)',   'auth', 3600, 4,  300, 14400, 'Strict'),
  ('auth.otp.account',         'Admin OTP / MFA (per account)',  'auth', 900,  6,  60,  3600,  'Strict'),
  ('public.contact',           'Contact form',                   'public', 3600, 10, 60, 3600,  'Moderate'),
  ('public.newsletter',        'Newsletter subscribe',           'public', 3600, 8,  60, 3600,  'Moderate'),
  ('public.support_chat',      'AI support chat',                'public', 300,  30, 30, 900,   'Moderate'),
  ('public.review_submit',     'Product review submit',          'public', 3600, 10, 60, 3600,  'Moderate'),
  ('public.offer_submit',      'Offer / giveaway submit',        'public', 3600, 6,  120, 3600, 'Moderate'),
  ('public.track_pageview',    'Analytics pageview',             'public', 60,   120, 0,  300,  'Moderate, no backoff'),
  ('public.webhook',           'Inbound webhooks',               'public', 60,   240, 0,  300,  'Moderate, no backoff'),
  ('public.api_read',          'Public API reads',               'public', 60,   120, 0,  300,  'Moderate'),
  ('user.order_create',        'Create order',                   'authenticated', 300, 20, 30, 900, 'Looser'),
  ('user.wallet_topup',        'Wallet top-up request',          'authenticated', 3600, 20, 60, 1800, 'Looser'),
  ('user.upload',              'File / image upload',            'authenticated', 300, 40, 15, 600, 'Looser'),
  ('user.ticket_create',       'Support ticket create',          'authenticated', 3600, 20, 60, 1800, 'Looser'),
  ('user.telegram_link',       'Telegram account link',          'authenticated', 3600, 20, 60, 1800, 'Looser'),
  ('user.action',              'Generic signed-in action',       'authenticated', 60,  90, 0,  300, 'Looser default'),
  ('admin.action',             'Admin panel action',             'admin', 60, 300, 0, 300, 'Very loose safety net')
ON CONFLICT (key) DO NOTHING;