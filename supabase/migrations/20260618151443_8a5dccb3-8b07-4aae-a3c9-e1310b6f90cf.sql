CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  visitor_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_chat_messages_session_idx ON public.live_chat_messages (session_id, created_at);
CREATE INDEX live_chat_messages_created_idx ON public.live_chat_messages (created_at DESC);

GRANT SELECT, INSERT ON public.live_chat_messages TO anon;
GRANT SELECT, INSERT ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat messages"
  ON public.live_chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all chat messages"
  ON public.live_chat_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete chat messages"
  ON public.live_chat_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));