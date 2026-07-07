-- Agent-to-Agent Delegations: tracks every cross-agent call (query or delegation)
CREATE TABLE IF NOT EXISTS agent_delegations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id        UUID REFERENCES messages(id) ON DELETE SET NULL,
  caller_agent_key  TEXT NOT NULL,
  target_agent_key  TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type              TEXT NOT NULL CHECK (type IN ('query', 'delegation')),
  prompt            TEXT NOT NULL,
  context           JSONB DEFAULT '{}'::jsonb,
  response          TEXT,
  response_metadata JSONB DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','cancelled')),
  mission_id        UUID REFERENCES missions(id) ON DELETE SET NULL,
  turns             JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER
);

CREATE INDEX idx_agent_delegations_conversation ON agent_delegations(conversation_id);
CREATE INDEX idx_agent_delegations_campaign ON agent_delegations(campaign_id);
CREATE INDEX idx_agent_delegations_user ON agent_delegations(user_id);
CREATE INDEX idx_agent_delegations_status ON agent_delegations(status) WHERE status IN ('pending', 'running');

ALTER TABLE agent_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_delegations_own ON agent_delegations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY agent_delegations_org_read ON agent_delegations
  FOR SELECT USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = agent_delegations.org_id
        AND om.user_id = auth.uid()
    )
  );
