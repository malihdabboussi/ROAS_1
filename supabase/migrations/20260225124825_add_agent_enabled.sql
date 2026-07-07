ALTER TABLE user_integrations
  ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN NOT NULL DEFAULT true;
