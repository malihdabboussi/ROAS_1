CREATE INDEX IF NOT EXISTS idx_agent_delegations_target_conversation
  ON agent_delegations(target_agent_key, conversation_id)
  WHERE status = 'completed';
