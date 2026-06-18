CREATE TABLE public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug text NOT NULL,
  user_id uuid,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_reviews_slug ON public.product_reviews(product_slug);
CREATE INDEX idx_product_reviews_created ON public.product_reviews(created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews FOR SELECT
USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert reviews"
ON public.product_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews"
ON public.product_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews"
ON public.product_reviews FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed random good reviews for all existing active products
WITH names(n) AS (
  VALUES ('Rakib Hasan'),('Tasnim Akter'),('Sakib Ahmed'),('Nusrat Jahan'),('Mahmud Hossain'),
    ('Farhana Islam'),('Imran Khan'),('Sumaiya Rahman'),('Tanvir Ahmed'),('Mehedi Hasan'),
    ('Ayesha Siddika'),('Rifat Chowdhury'),('Shahriar Kabir'),('Mitu Akter'),('Anik Sarker'),
    ('Sabbir Ahmed'),('Rumana Khatun'),('Fahim Reza'),('Naimur Rahman'),('Jannatul Ferdous'),
    ('Ariful Islam'),('Nadia Sultana'),('Mahin Khan'),('Tahmid Hasan'),('Sumon Mia'),
    ('Lamia Akter'),('Rezaul Karim'),('Shamima Nasrin'),('Tariq Aziz'),('Mou Sharmin')
),
comments(c, r) AS (
  VALUES
    ('Fast delivery, key worked instantly. Highly recommended!', 5),
    ('Excellent service and genuine product. Will buy again.', 5),
    ('Got my subscription within 10 minutes. Amazing support!', 5),
    ('Best price in Bangladesh. Activation was smooth.', 5),
    ('Trusted seller, working perfectly without any issue.', 5),
    ('Awesome customer support over WhatsApp. Five stars!', 5),
    ('Legit product at affordable price. Very satisfied.', 5),
    ('Quick response and instant delivery. Loved it.', 5),
    ('Working flawlessly on my device. Great experience.', 4),
    ('Cheap and reliable, exactly as described.', 5),
    ('Smooth process from order to delivery. Recommended.', 5),
    ('Renewed my subscription here, no problems at all.', 5),
    ('AccessNow BD is the most trusted shop. Thank you!', 5),
    ('Got premium features at a fraction of the cost.', 5),
    ('Delivered before the promised time. Excellent!', 5),
    ('Authentic license, activated without any hassle.', 5),
    ('Bought multiple times — never disappointed.', 5),
    ('Support team is very helpful and quick to respond.', 4),
    ('Best place to buy in BD, 100% genuine.', 5),
    ('Long-term warranty and great after-sales service.', 5)
)
INSERT INTO public.product_reviews (product_slug, reviewer_name, rating, comment, created_at, is_approved)
SELECT
  p.slug,
  (SELECT n FROM names ORDER BY random() LIMIT 1),
  cc.r,
  cc.c,
  now() - (random() * interval '120 days'),
  true
FROM public.products p
CROSS JOIN LATERAL (
  SELECT c, r FROM comments ORDER BY random() LIMIT (4 + floor(random()*4)::int)
) cc
WHERE p.is_active = true;