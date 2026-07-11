
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public._notify_deliver_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_endpoint text;
BEGIN
  IF NEW.status IN ('completed','delivered')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('completed','delivered')) THEN

    SELECT (data->>'secret'), (data->>'endpoint')
      INTO v_secret, v_endpoint
    FROM public.admin_records
    WHERE kind = 'blog_autogen_config'
    ORDER BY created_at
    LIMIT 1;

    IF v_secret IS NULL OR length(v_secret) < 8 THEN
      RETURN NEW;
    END IF;

    -- Derive the deliver-downloads endpoint from the same base URL
    v_endpoint := COALESCE(v_endpoint, 'https://project--bvoeflkypmonhbmwfbmx.lovable.app/api/public/generate-blogs');
    v_endpoint := regexp_replace(v_endpoint, '/api/public/[^/]+$', '/api/public/deliver-downloads');

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Autogen-Secret', v_secret
      ),
      body := jsonb_build_object('orderId', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_deliver_downloads ON public.orders;
CREATE TRIGGER trg_orders_deliver_downloads
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._notify_deliver_downloads();
