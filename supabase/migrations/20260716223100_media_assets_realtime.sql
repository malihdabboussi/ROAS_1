-- Space Media gallery listens for postgres_changes on media_assets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'media_assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets;
  END IF;
END $$;
