-- Add channel_messages to Supabase Realtime publication so that
-- agent replies and status updates propagate to frontends via postgres_changes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'channel_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
  END IF;
END $$;
