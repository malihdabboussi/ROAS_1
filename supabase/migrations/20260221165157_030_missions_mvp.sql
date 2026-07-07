-- 030: Missions MVP tables (manager/copywriter/designer)

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brief TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'dispatching', 'running', 'done', 'failed', 'dead_letter')),
  assigned_agent_key TEXT
    CHECK (assigned_agent_key IN ('manager', 'copywriter', 'designer')),
  current_agent_key TEXT
    CHECK (current_agent_key IN ('manager', 'copywriter', 'designer')),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_user_idempotency
  ON missions(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_missions_user_status
  ON missions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_parent
  ON missions(parent_mission_id);
CREATE INDEX IF NOT EXISTS idx_missions_correlation
  ON missions(correlation_id);

CREATE TABLE IF NOT EXISTS agents_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL
    CHECK (agent_key IN ('manager', 'copywriter', 'designer')),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('online', 'idle', 'working', 'offline')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_key)
);

CREATE INDEX IF NOT EXISTS idx_agents_registry_user
  ON agents_registry(user_id);

CREATE TABLE IF NOT EXISTS missions_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  agent_key TEXT
    CHECK (agent_key IN ('manager', 'copywriter', 'designer')),
  correlation_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_logs_mission_created
  ON missions_logs(mission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_logs_user_created
  ON missions_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_logs_correlation
  ON missions_logs(correlation_id);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missions_own ON missions;
CREATE POLICY missions_own ON missions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS agents_registry_own ON agents_registry;
CREATE POLICY agents_registry_own ON agents_registry
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS missions_logs_own ON missions_logs;
CREATE POLICY missions_logs_own ON missions_logs
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_missions ON missions;
CREATE TRIGGER set_updated_at_missions
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_agents_registry ON agents_registry;
CREATE TRIGGER set_updated_at_agents_registry
  BEFORE UPDATE ON agents_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO agents_registry (user_id, agent_key, name, role, skills)
SELECT u.id, seed.agent_key, seed.name, seed.role, seed.skills
FROM auth.users u
CROSS JOIN (
  VALUES
    ('manager', 'Manager', 'Mission Manager', '["routing","delegation","briefing"]'::jsonb),
    ('copywriter', 'Copywriter', 'Copywriting Specialist', '["email-copy","landing-copy","headlines"]'::jsonb),
    ('designer', 'Designer', 'Design Specialist', '["visual-direction","creative-briefs","asset-design"]'::jsonb)
) AS seed(agent_key, name, role, skills)
ON CONFLICT (user_id, agent_key) DO NOTHING;;
