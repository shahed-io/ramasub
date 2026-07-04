ALTER TABLE public.abandoned_checkouts
  ADD COLUMN IF NOT EXISTS sender_number text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text,
  ADD COLUMN IF NOT EXISTS customer_note text,
  ADD COLUMN IF NOT EXISTS checkout_step integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS abandoned_checkouts_updated_idx
  ON public.abandoned_checkouts (updated_at DESC);