-- Mission Subtasks: first-class subtask entities with per-agent assignment and dependency graph
CREATE TABLE IF NOT EXISTS mission_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'revision', 'blocked')),
  assigned_agent_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  depends_on UUID[] DEFAULT '{}',
  output JSONB DEFAULT '{}'::jsonb,
  feedback TEXT,
  deliverable_id UUID REFERENCES mission_deliverables(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mission_subtasks_mission_order ON mission_subtasks(mission_id, sort_order);
CREATE INDEX idx_mission_subtasks_mission_status ON mission_subtasks(mission_id, status);
CREATE INDEX idx_mission_subtasks_user ON mission_subtasks(user_id);

ALTER TABLE mission_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on mission_subtasks"
  ON mission_subtasks FOR ALL
  USING (true) WITH CHECK (true);
