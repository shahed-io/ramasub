CREATE OR REPLACE FUNCTION public.mark_abandoned_recovered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.abandoned_checkouts
     SET status = 'recovered', recovered_at = now(), recovered_order_id = NEW.id, updated_at = now()
   WHERE status <> 'recovered'
     AND created_at <= NEW.created_at + interval '1 minute'
     AND ( (NEW.user_id IS NOT NULL AND user_id = NEW.user_id)
        OR (coalesce(NEW.email,'') <> '' AND lower(email) = lower(NEW.email))
        OR (coalesce(NEW.phone,'') <> '' AND phone <> '' AND right(regexp_replace(phone,'\D','','g'),10) = right(regexp_replace(NEW.phone,'\D','','g'),10)) );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_mark_abandoned_recovered ON public.orders;
CREATE TRIGGER orders_mark_abandoned_recovered AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_abandoned_recovered();

CREATE INDEX IF NOT EXISTS abandoned_checkouts_email_idx ON public.abandoned_checkouts (lower(email));
CREATE INDEX IF NOT EXISTS abandoned_checkouts_phone_idx ON public.abandoned_checkouts (phone);

WITH m AS (
  SELECT a.id AS aid, (
    SELECT o.id FROM public.orders o
     WHERE o.created_at >= a.created_at - interval '1 minute'
       AND ( (a.user_id IS NOT NULL AND o.user_id = a.user_id)
          OR (a.email <> '' AND lower(o.email) = lower(a.email))
          OR (a.phone <> '' AND right(regexp_replace(o.phone,'\D','','g'),10) = right(regexp_replace(a.phone,'\D','','g'),10)) )
     ORDER BY o.created_at LIMIT 1) AS oid
  FROM public.abandoned_checkouts a WHERE a.status <> 'recovered'
)
UPDATE public.abandoned_checkouts a
   SET status = 'recovered', recovered_order_id = m.oid,
       recovered_at = (SELECT created_at FROM public.orders WHERE id = m.oid)
  FROM m WHERE m.aid = a.id AND m.oid IS NOT NULL;

UPDATE public.abandoned_checkouts SET subtotal = total WHERE subtotal = 0 AND total > 0;