CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_assigned_agent_key
  ON missions (assigned_agent_key) WHERE assigned_agent_key IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_current_agent_key
  ON missions (current_agent_key) WHERE current_agent_key IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mission_subtasks_assigned_agent_key
  ON mission_subtasks (assigned_agent_key) WHERE assigned_agent_key IS NOT NULL;
