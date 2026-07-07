-- Backfill: seed a baseline vibey row for every org that has org-scoped agents
-- but is missing an org-scoped vibey. These orgs escaped the onboarding flow
-- and only got Atlas via the /team page backfill.
-- The frontend guard will redirect their owners to /org-setup on next visit,
-- which will promote this row to c_level/CEO and seed the remaining agents.

INSERT INTO agents_registry (user_id, org_id, agent_key, name, role, skills, status, level, config, created_by)
SELECT
  NULL,
  ar.org_id,
  'vibey',
  'Vibey',
  'CMO',
  '[]'::jsonb,
  'idle',
  'system',
  jsonb_build_object(
    'archetype', 'ceo',
    'capability_profile', 'vibey_ceo',
    'capability_domain', 'shared',
    'model_id', 'auto'
  ),
  om.user_id
FROM (
  SELECT DISTINCT org_id
  FROM agents_registry
  WHERE org_id IS NOT NULL AND user_id IS NULL
) ar
JOIN org_members om ON om.org_id = ar.org_id AND om.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM agents_registry v
  WHERE v.org_id = ar.org_id
    AND v.agent_key = 'vibey'
    AND v.user_id IS NULL
);
