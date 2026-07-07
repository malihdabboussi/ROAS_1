DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'brain_import_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE brain_import_jobs;
  END IF;
END $$;
