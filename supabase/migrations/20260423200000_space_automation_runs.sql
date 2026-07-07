CREATE TABLE IF NOT EXISTS space_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES space_items(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL,
  org_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_event JSONB NOT NULL,
  actions_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  linked_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_space_automation_runs_space ON space_automation_runs(space_id);
CREATE INDEX idx_space_automation_runs_item ON space_automation_runs(item_id);
CREATE INDEX idx_space_automation_runs_automation ON space_automation_runs(automation_id);
CREATE INDEX idx_space_automation_runs_created ON space_automation_runs(created_at DESC);

ALTER TABLE space_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automation runs"
  ON space_automation_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view automation runs"
  ON space_automation_runs FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own automation runs"
  ON space_automation_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
