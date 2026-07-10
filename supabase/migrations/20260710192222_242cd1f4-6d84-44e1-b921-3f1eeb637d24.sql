
ALTER TABLE public.telegram_settings
  ADD COLUMN IF NOT EXISTS customer_bot_token text,
  ADD COLUMN IF NOT EXISTS customer_bot_username text,
  ADD COLUMN IF NOT EXISTS customer_bot_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_events jsonb NOT NULL DEFAULT '{"order_created":true,"order_status_changed":true,"wallet_topup":true,"promotion":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_webhook_secret text;

-- Links: one Telegram chat per user
CREATE TABLE IF NOT EXISTS public.telegram_customer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  telegram_username text,
  first_name text,
  last_name text,
  phone text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(chat_id)
);
GRANT SELECT ON public.telegram_customer_links TO authenticated;
GRANT ALL ON public.telegram_customer_links TO service_role;
ALTER TABLE public.telegram_customer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own telegram link" ON public.telegram_customer_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage telegram links" ON public.telegram_customer_links
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tg_links_updated BEFORE UPDATE ON public.telegram_customer_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- One-time deep-link codes
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz
);
GRANT ALL ON public.telegram_link_codes TO service_role;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read link codes" ON public.telegram_link_codes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_tg_link_codes_user ON public.telegram_link_codes(user_id);

-- Phone OTPs (for bot-initiated linking)
CREATE TABLE IF NOT EXISTS public.telegram_phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at timestamptz,
  attempts int NOT NULL DEFAULT 0
);
GRANT ALL ON public.telegram_phone_otps TO service_role;
ALTER TABLE public.telegram_phone_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read phone otps" ON public.telegram_phone_otps
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_tg_otps_chat ON public.telegram_phone_otps(chat_id);
