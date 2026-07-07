-- Ensure all artifact root tables used by Artifacts tree are in Realtime publication.
-- Without this, INSERT/UPDATE/DELETE events never reach browser subscriptions,
-- so the artifact tree does not refresh after creation.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE offers;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'funnels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE funnels;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sequences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sequences;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lead_magnets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lead_magnets;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'social_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blog_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blog_posts;
  END IF;
END;
$$;
