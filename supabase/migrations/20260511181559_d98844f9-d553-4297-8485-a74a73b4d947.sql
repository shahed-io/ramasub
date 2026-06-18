
CREATE TABLE public.admin_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_records_kind ON public.admin_records(kind, sort_order);

ALTER TABLE public.admin_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active admin records"
ON public.admin_records FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert admin records"
ON public.admin_records FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update admin records"
ON public.admin_records FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete admin records"
ON public.admin_records FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_admin_records_updated
BEFORE UPDATE ON public.admin_records
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
