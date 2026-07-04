ALTER TABLE public.abandoned_checkouts REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='abandoned_checkouts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_checkouts';
  END IF;
END $$;