-- Rotate the customer bot webhook secret: the previous value was committed to
-- the repository in an earlier migration file and must be treated as exposed.
UPDATE public.telegram_settings
SET customer_webhook_secret = encode(gen_random_bytes(24), 'hex')
WHERE singleton = true;