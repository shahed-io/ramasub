CREATE TABLE IF NOT EXISTS public.bot_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salt TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 4,
  ip TEXT,
  purpose TEXT NOT NULL DEFAULT 'signup',
  solved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_challenges TO service_role;
ALTER TABLE public.bot_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bot_passes (
  token TEXT NOT NULL PRIMARY KEY,
  purpose TEXT NOT NULL DEFAULT 'signup',
  provider TEXT NOT NULL DEFAULT 'pow',
  ip TEXT,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_passes TO service_role;
ALTER TABLE public.bot_passes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS bot_challenges_expires_idx ON public.bot_challenges (expires_at);
CREATE INDEX IF NOT EXISTS bot_passes_expires_idx ON public.bot_passes (expires_at);

INSERT INTO public.rate_limit_rules (key, label, category, window_seconds, max_requests, backoff_base_seconds, backoff_max_seconds, enabled, notes)
VALUES
  ('ddos.global.ip', 'Site-wide requests per IP', 'public', 60, 600, 30, 3600, true, 'DDoS shield: sustained page/request flood per IP.'),
  ('ddos.burst.ip', 'Burst requests per IP', 'public', 10, 120, 20, 1800, true, 'DDoS shield: short burst flood per IP.'),
  ('bot.challenge.ip', 'Bot challenge requests per IP', 'public', 60, 30, 30, 3600, true, 'Bot verification: challenge issuance per IP.'),
  ('bot.verify.ip', 'Bot verification attempts per IP', 'auth', 300, 20, 60, 7200, true, 'Bot verification: failed/successful verify attempts per IP.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.admin_records (kind, data)
SELECT 'bot_protection', jsonb_build_object(
  'shield_enabled', true,
  'pow_enabled', true,
  'pow_difficulty', 4,
  'turnstile_enabled', false,
  'turnstile_site_key', '',
  'ddos_enabled', true
)
WHERE NOT EXISTS (SELECT 1 FROM public.admin_records WHERE kind = 'bot_protection');