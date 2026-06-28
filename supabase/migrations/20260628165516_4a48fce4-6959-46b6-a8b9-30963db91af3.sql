
-- Offer campaigns
CREATE TABLE public.offer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_image text,
  status text NOT NULL DEFAULT 'draft', -- draft | active | ended
  starts_at timestamptz,
  ends_at timestamptz,
  winner_count integer NOT NULL DEFAULT 1,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{rank:1,title:"...",description:"...",image:""}]
  fields_schema jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{id,type,label,required,options?,placeholder?}]
  success_message text DEFAULT 'ধন্যবাদ! আপনার entry সফলভাবে গৃহীত হয়েছে।',
  redirect_url text,
  google_form_url text, -- optional embed link
  ai_selection_prompt text, -- custom criteria for AI winner pick
  allow_multiple_entries boolean NOT NULL DEFAULT false,
  show_winners_publicly boolean NOT NULL DEFAULT true,
  total_submissions integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.offer_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offer_campaigns TO authenticated;
GRANT ALL ON public.offer_campaigns TO service_role;
ALTER TABLE public.offer_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active/ended campaigns"
  ON public.offer_campaigns FOR SELECT
  USING (status IN ('active','ended') OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins manage campaigns"
  ON public.offer_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_offer_campaigns_updated_at
  BEFORE UPDATE ON public.offer_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Submissions
CREATE TABLE public.offer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.offer_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  is_winner boolean NOT NULL DEFAULT false,
  winner_rank integer,
  ai_score numeric,
  ai_reason text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offer_subs_campaign ON public.offer_submissions(campaign_id);
CREATE INDEX idx_offer_subs_email ON public.offer_submissions(campaign_id, lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_submissions TO authenticated;
GRANT INSERT ON public.offer_submissions TO anon;
GRANT ALL ON public.offer_submissions TO service_role;
ALTER TABLE public.offer_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit"
  ON public.offer_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users view own submissions"
  ON public.offer_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins manage submissions"
  ON public.offer_submissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Public view winners of show_winners_publicly campaigns"
  ON public.offer_submissions FOR SELECT
  TO anon, authenticated
  USING (
    is_winner = true AND EXISTS (
      SELECT 1 FROM public.offer_campaigns c
      WHERE c.id = campaign_id AND c.show_winners_publicly = true AND c.status = 'ended'
    )
  );

-- Increment submission counter
CREATE OR REPLACE FUNCTION public._offer_increment_submissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offer_campaigns SET total_submissions = total_submissions + 1 WHERE id = NEW.campaign_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_offer_sub_increment
  AFTER INSERT ON public.offer_submissions
  FOR EACH ROW EXECUTE FUNCTION public._offer_increment_submissions();
