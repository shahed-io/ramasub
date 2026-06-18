
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text NULL,
  status text NOT NULL DEFAULT 'pending',
  contacted_at timestamptz NULL,
  recovered_at timestamptz NULL,
  recovered_order_id uuid NULL,
  admin_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS abandoned_checkouts_email_key ON public.abandoned_checkouts (lower(email));
CREATE INDEX IF NOT EXISTS abandoned_checkouts_status_idx ON public.abandoned_checkouts (status);
CREATE INDEX IF NOT EXISTS abandoned_checkouts_created_idx ON public.abandoned_checkouts (created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.abandoned_checkouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abandoned_checkouts TO authenticated;
GRANT ALL ON public.abandoned_checkouts TO service_role;

ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own checkout snapshot (anonymous capture)
CREATE POLICY "Anyone can insert abandoned checkouts"
  ON public.abandoned_checkouts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update by email (used for upsert from anonymous checkout page).
-- Sensitive read/delete remains admin-only.
CREATE POLICY "Anyone can update abandoned checkouts"
  ON public.abandoned_checkouts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can view abandoned checkouts"
  ON public.abandoned_checkouts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete
CREATE POLICY "Admins can delete abandoned checkouts"
  ON public.abandoned_checkouts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger
CREATE TRIGGER abandoned_checkouts_touch
BEFORE UPDATE ON public.abandoned_checkouts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-mark recovered when a matching order arrives
CREATE OR REPLACE FUNCTION public.mark_abandoned_recovered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.abandoned_checkouts
       SET status = 'recovered',
           recovered_at = now(),
           recovered_order_id = NEW.id
     WHERE lower(email) = lower(NEW.email)
       AND status <> 'recovered';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_mark_abandoned_recovered ON public.orders;
CREATE TRIGGER orders_mark_abandoned_recovered
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_abandoned_recovered();
