-- Phase 1: Consolidate tasks table into missions
-- Adds missing task-only columns to missions, migrates standalone tasks,
-- migrates task_prds to missions_plans, backfills task fields on existing missions,
-- then drops all sync triggers.

-- 1a. Add missing columns to missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;

-- 1b. Migrate standalone tasks (mission_id IS NULL) into missions via temp mapping
DO $$
DECLARE
  rec RECORD;
  new_mission_id UUID;
BEGIN
  FOR rec IN
    SELECT * FROM tasks WHERE mission_id IS NULL
  LOOP
    new_mission_id := gen_random_uuid();

    INSERT INTO missions (
      id, user_id, title, brief, status, priority, campaign_id,
      sort_order, tags, due_date, estimated_hours, actual_hours,
      correlation_id, idempotency_key, retry_count, input,
      created_at, updated_at, completed_at
    ) VALUES (
      new_mission_id,
      rec.user_id,
      rec.title,
      rec.description,
      rec.status,
      rec.priority,
      rec.campaign_id,
      rec.sort_order,
      rec.tags,
      rec.due_date,
      rec.estimated_hours,
      rec.actual_hours,
      gen_random_uuid()::text,
      'migrated-task-' || rec.id::text,
      0,
      '{}',
      rec.created_at,
      rec.updated_at,
      rec.completed_at
    );

    -- 1c. Migrate task_prds for this standalone task → missions_plans
    INSERT INTO missions_plans (mission_id, user_id, content, created_by, created_at, updated_at)
    SELECT
      new_mission_id,
      rec.user_id,
      tp.content,
      'migrated',
      tp.created_at,
      tp.updated_at
    FROM task_prds tp
    WHERE tp.task_id = rec.id
    ORDER BY tp.version DESC
    LIMIT 1;
  END LOOP;
END $$;

-- 1d. Backfill task-only fields onto missions that already have linked tasks
UPDATE missions m
SET sort_order = t.sort_order,
    tags = t.tags,
    due_date = t.due_date,
    estimated_hours = t.estimated_hours,
    actual_hours = t.actual_hours
FROM tasks t
WHERE t.mission_id = m.id;

-- 1e. Drop sync triggers
DROP TRIGGER IF EXISTS trg_sync_mission_to_task ON missions;
DROP TRIGGER IF EXISTS trg_mission_to_task ON missions;
DROP TRIGGER IF EXISTS trg_sync_task_to_mission ON tasks;
DROP TRIGGER IF EXISTS trg_task_to_mission ON tasks;
DROP TRIGGER IF EXISTS trg_sync_task_delete ON tasks;
DROP TRIGGER IF EXISTS trg_task_delete_to_mission ON tasks;

DROP FUNCTION IF EXISTS sync_mission_to_task() CASCADE;
DROP FUNCTION IF EXISTS sync_task_to_mission() CASCADE;
DROP FUNCTION IF EXISTS sync_task_delete_to_mission() CASCADE;

-- 1f. Remove tasks from realtime publication and drop tables
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS tasks;

DROP TABLE IF EXISTS task_prds;
DROP TABLE IF EXISTS tasks;
