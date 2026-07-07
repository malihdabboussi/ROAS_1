-- Add archetype_filter to agent_skills.
-- NULL = available to all archetypes (CMO, CEO, COO).
-- Non-null = only loaded when the user's vibey archetype matches one of the values.
-- Values: 'ceo', 'coo'. CMO (Create mode) has archetype = NULL in config.

ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS archetype_filter text[] DEFAULT NULL;

COMMENT ON COLUMN agent_skills.archetype_filter IS
  'NULL = all archetypes. Non-null array = skill only loads when vibey archetype is in this list. Values: ceo, coo.';

-- Tag the 5 manage-only system skills with their archetype filters.
-- awareness-evaluator: CEO only
UPDATE agent_skills
SET archetype_filter = '{ceo}'
WHERE user_id IS NULL AND agent_key = 'vibey' AND skill_key = 'awareness-evaluator';

-- mission-planner, mission-reviewer, mission-worker-executor, onboarding-discovery: CEO + COO
UPDATE agent_skills
SET archetype_filter = '{ceo,coo}'
WHERE user_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key IN ('mission-planner', 'mission-reviewer', 'mission-worker-executor', 'onboarding-discovery');
