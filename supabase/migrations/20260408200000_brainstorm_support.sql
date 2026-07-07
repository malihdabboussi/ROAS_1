-- Extend type CHECK to include brainstorm
ALTER TABLE agent_delegations DROP CONSTRAINT IF EXISTS agent_delegations_type_check;
ALTER TABLE agent_delegations ADD CONSTRAINT agent_delegations_type_check
  CHECK (type IN ('query', 'delegation', 'brainstorm'));

-- Participants config for brainstorm sessions
-- Shape: [{ agent_key, name, role, image_url }]
ALTER TABLE agent_delegations ADD COLUMN IF NOT EXISTS
  participants JSONB DEFAULT NULL;

-- Brainstorm config (rounds, order)
-- Shape: { rounds: number, order: string[] }
ALTER TABLE agent_delegations ADD COLUMN IF NOT EXISTS
  config JSONB DEFAULT NULL;
