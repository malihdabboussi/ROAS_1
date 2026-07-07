-- 045: Remove fixed CHECK constraint on agent_key to allow dynamic agent creation
-- The HR agent creates agents with user-chosen keys (e.g. 'dev', 'analyst', 'copywriter_2')

ALTER TABLE agents_registry DROP CONSTRAINT IF EXISTS agents_registry_agent_key_check;
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_assigned_agent_key_check;
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_current_agent_key_check;
ALTER TABLE missions_logs DROP CONSTRAINT IF EXISTS missions_logs_agent_key_check;
