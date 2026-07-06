ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS admin_reply_at timestamptz;

-- Backfill from existing is_approved so the current 142 approved reviews stay visible.
UPDATE public.product_reviews
SET status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
WHERE status = 'pending' AND is_approved = true;

-- Constrain values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_reviews_status_chk'
  ) THEN
    ALTER TABLE public.product_reviews
      ADD CONSTRAINT product_reviews_status_chk
      CHECK (status IN ('pending','approved','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_reviews_status_idx ON public.product_reviews(status);