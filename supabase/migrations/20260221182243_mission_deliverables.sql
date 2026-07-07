CREATE TABLE IF NOT EXISTS mission_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('doc', 'text', 'image', 'video', 'pdf', 'file')),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mission_deliverables_mission ON mission_deliverables(mission_id);
CREATE INDEX idx_mission_deliverables_user ON mission_deliverables(user_id, created_at DESC);

ALTER TABLE mission_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY mission_deliverables_own ON mission_deliverables
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());;
