-- Atlas, HR, Viktor: user_brain_access for manage roles (same product default as other agents).

UPDATE agents_registry ar
SET user_brain_access = true
FROM user_profiles up
WHERE ar.user_id = up.id
  AND up.role IN ('power', 'admin', 'enterprise')
  AND ar.agent_key IN ('atlas', 'hr', 'viktor')
  AND ar.user_brain_access IS NOT TRUE;
