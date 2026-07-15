CREATE TABLE public.telegram_bot_sessions (
  chat_id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  step TEXT NOT NULL DEFAULT 'idle',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_bot_sessions TO service_role;

ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER touch_telegram_bot_sessions
  BEFORE UPDATE ON public.telegram_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_telegram_bot_sessions_user ON public.telegram_bot_sessions(user_id);
CREATE INDEX idx_telegram_bot_sessions_updated ON public.telegram_bot_sessions(updated_at DESC);