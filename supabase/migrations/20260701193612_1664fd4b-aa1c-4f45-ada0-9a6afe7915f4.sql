
-- Telegram monitoring settings (singleton)
CREATE TABLE public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  chat_id text,
  enabled boolean NOT NULL DEFAULT false,
  events jsonb NOT NULL DEFAULT '{
    "order_created":true,
    "order_status_changed":true,
    "wallet_topup":true,
    "support_ticket":true,
    "chat_message":true,
    "offer_submission":true,
    "new_signup":true,
    "abandoned_checkout":false
  }'::jsonb,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_settings TO authenticated;
GRANT ALL ON public.telegram_settings TO service_role;

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage telegram settings"
  ON public.telegram_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_telegram_settings_updated
  BEFORE UPDATE ON public.telegram_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Log of sent notifications for audit / debugging
CREATE TABLE public.telegram_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb,
  message text,
  success boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.telegram_notifications_log TO authenticated;
GRANT ALL ON public.telegram_notifications_log TO service_role;

ALTER TABLE public.telegram_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read telegram log"
  ON public.telegram_notifications_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "System inserts telegram log"
  ON public.telegram_notifications_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_telegram_log_created ON public.telegram_notifications_log(created_at DESC);

-- Seed singleton row so admin UI can update directly
INSERT INTO public.telegram_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;
