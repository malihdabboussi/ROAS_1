-- Backfill user_brain_access for HQ / Mission Control roles (power, admin, enterprise).
-- Eligible agents: not system level, not atlas.

UPDATE agents_registry ar
SET user_brain_access = true
FROM user_profiles up
WHERE ar.user_id = up.id
  AND up.role IN ('power', 'admin', 'enterprise')
  AND COALESCE(ar.level, '') <> 'system'
  AND ar.agent_key IS DISTINCT FROM 'atlas'
  AND ar.user_brain_access IS NOT TRUE;
