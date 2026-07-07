-- Add forms tables to the supabase_realtime publication so the Spaces Forms view
-- updates live when forms or responses are created/updated/deleted.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND c.relname = 'forms'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND c.relname = 'form_responses'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.form_responses;
    END IF;
  END IF;
END $$;
