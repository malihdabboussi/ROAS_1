ALTER TABLE mission_subtasks ADD COLUMN IF NOT EXISTS intent JSONB DEFAULT '{}'::jsonb;
