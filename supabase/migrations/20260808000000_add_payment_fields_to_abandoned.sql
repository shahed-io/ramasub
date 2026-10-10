ALTER TABLE public.abandoned_checkouts
ADD COLUMN IF NOT EXISTS payment_method text NULL,
ADD COLUMN IF NOT EXISTS transaction_id text NULL,
ADD COLUMN IF NOT EXISTS payment_screenshot_url text NULL,
ADD COLUMN IF NOT EXISTS sender_number text NULL,
ADD COLUMN IF NOT EXISTS customer_note text NULL,
ADD COLUMN IF NOT EXISTS checkout_step text NULL;
