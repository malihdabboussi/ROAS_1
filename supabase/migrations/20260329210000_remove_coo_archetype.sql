-- Remove COO archetype: migrate existing COO agents to CEO, strip COO from skill filters,
-- and clean awareness-evaluator copy so it no longer references COO conditionals.

-- 1. Convert all existing COO agents to CEO (archetype + capability_profile).
UPDATE agents_registry
SET config = jsonb_set(
  jsonb_set(config, '{archetype}', '"ceo"'),
  '{capability_profile}', '"vibey_ceo"'
)
WHERE config->>'archetype' = 'coo';

-- 2. Clean archetype_filter arrays by removing 'coo'.
UPDATE agent_skills
SET archetype_filter = array_remove(archetype_filter, 'coo')
WHERE 'coo' = ANY(archetype_filter);

-- 3. awareness-evaluator (vibey): remove COO-specific wording via chained REPLACE.
UPDATE agent_skills
SET markdown_content = REPLACE(
  REPLACE(
    REPLACE(markdown_content, 'CEO (or COO)', 'CEO'),
    'COO cannot use act',
    ''
  ),
  'If you are a **COO**',
  'If you are the **CEO**'
)
WHERE skill_key = 'awareness-evaluator' AND agent_key = 'vibey';
