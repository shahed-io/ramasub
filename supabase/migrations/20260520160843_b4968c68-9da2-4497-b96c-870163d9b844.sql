
-- Add optional payment screenshot URL column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

-- Create public bucket for customer payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow authenticated users to upload, public read
DROP POLICY IF EXISTS "Public can view payment screenshots" ON storage.objects;
CREATE POLICY "Public can view payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Authenticated users upload payment screenshots" ON storage.objects;
CREATE POLICY "Authenticated users upload payment screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Users update own payment screenshots" ON storage.objects;
CREATE POLICY "Users update own payment screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
