
-- Tasks table with full Nexus parity
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'planning', 'todo', 'in_progress', 'review', 'done', 'blocked', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Task PRDs table
CREATE TABLE IF NOT EXISTS task_prds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_prds_task_id ON task_prds(task_id);

ALTER TABLE task_prds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own task PRDs"
  ON task_prds FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_prds.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can insert own task PRDs"
  ON task_prds FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_prds.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can update own task PRDs"
  ON task_prds FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_prds.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can delete own task PRDs"
  ON task_prds FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_prds.task_id AND tasks.user_id = auth.uid()));
;
