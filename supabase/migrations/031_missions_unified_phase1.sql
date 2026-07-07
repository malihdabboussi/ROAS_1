-- 031: Missions unified model (phase 1)

-- Expand mission status lifecycle while keeping legacy statuses for compatibility.
ALTER TABLE missions
  DROP CONSTRAINT IF EXISTS missions_status_check;

ALTER TABLE missions
  ADD CONSTRAINT missions_status_check
  CHECK (
    status IN (
      'inbox',
      'planning',
      'todo',
      'in_progress',
      'review',
      'done',
      'failed',
      'dead_letter',
      'queued',
      'dispatching',
      'running'
    )
  );

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS progress_notes TEXT;

CREATE TABLE IF NOT EXISTS missions_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES missions_plans(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_plans_mission_unique
  ON missions_plans(mission_id);

CREATE INDEX IF NOT EXISTS idx_missions_plans_user_created
  ON missions_plans(user_id, created_at DESC);

ALTER TABLE missions_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missions_plans_own ON missions_plans;
CREATE POLICY missions_plans_own ON missions_plans
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_missions_plans ON missions_plans;
CREATE TRIGGER set_updated_at_missions_plans
  BEFORE UPDATE ON missions_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
