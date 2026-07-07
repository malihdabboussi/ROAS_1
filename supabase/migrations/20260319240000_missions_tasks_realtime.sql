-- Mission Control + task detail: Supabase Realtime publication for missions-related tables.
-- REPLICA IDENTITY FULL enables filtered postgres_changes (UPDATE/DELETE) to match client filters.

-- Tighten mission_subtasks RLS (was open TO ALL via USING(true)); required for safe multi-tenant Realtime.
DROP POLICY IF EXISTS "Service role full access on mission_subtasks" ON public.mission_subtasks;
DROP POLICY IF EXISTS mission_subtasks_user_scoped ON public.mission_subtasks;
CREATE POLICY mission_subtasks_user_scoped ON public.mission_subtasks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE missions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'missions_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE missions_logs;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'missions_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE missions_plans;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mission_deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mission_deliverables;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mission_subtasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mission_subtasks;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agents_registry'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agents_registry;
  END IF;
END $$;

ALTER TABLE missions REPLICA IDENTITY FULL;
ALTER TABLE missions_logs REPLICA IDENTITY FULL;
ALTER TABLE missions_plans REPLICA IDENTITY FULL;
ALTER TABLE mission_deliverables REPLICA IDENTITY FULL;
ALTER TABLE mission_subtasks REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE agents_registry REPLICA IDENTITY FULL;
