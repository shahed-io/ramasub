ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

CREATE OR REPLACE FUNCTION public.guard_delivered_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    NEW.delivered_credentials := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_delivered_credentials ON public.orders;
CREATE TRIGGER trg_guard_delivered_credentials
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_delivered_credentials();

UPDATE public.orders
SET delivered_credentials = NULL
WHERE status IS DISTINCT FROM 'completed'
  AND delivered_credentials IS NOT NULL;