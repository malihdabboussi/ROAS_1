DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_post_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_post_schedules;
  END IF;
END $$;
