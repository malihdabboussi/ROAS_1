-- Promote legacy c_level agent keys into vibey and clean old rows.
-- Scope: users that still have c_level agent_key != 'vibey'.

CREATE TEMP TABLE legacy_promoted_agents ON COMMIT DROP AS
SELECT
  ar.user_id,
  ar.agent_key AS legacy_agent_key,
  ar.role AS legacy_role,
  ar.config AS legacy_config,
  ar.image_url AS legacy_image_url
FROM public.agents_registry ar
WHERE ar.level = 'c_level'
  AND ar.agent_key <> 'vibey';

-- Ensure vibey exists for impacted users.
INSERT INTO public.agents_registry (
  user_id,
  agent_key,
  name,
  role,
  skills,
  status,
  config,
  level,
  user_brain_access
)
SELECT
  l.user_id,
  'vibey',
  'Vibey',
  'CMO',
  '[]'::jsonb,
  'idle',
  jsonb_build_object(
    'archetype',
    NULL,
    'capability_profile',
    'vibey_closed',
    'capability_domain',
    'shared',
    'model_id',
    'auto'
  ),
  'system',
  true
FROM legacy_promoted_agents l
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agents_registry ar
  WHERE ar.user_id = l.user_id
    AND ar.agent_key = 'vibey'
);

-- Promote vibey using legacy role/config signal.
UPDATE public.agents_registry v
SET
  level = 'c_level',
  role = CASE
    WHEN lower(COALESCE(l.legacy_role, '')) LIKE '%coo%' THEN 'COO'
    ELSE 'CEO'
  END,
  name = 'Vibey',
  image_url = COALESCE(v.image_url, l.legacy_image_url),
  config = COALESCE(v.config, '{}'::jsonb)
    || jsonb_build_object(
      'archetype',
      CASE
        WHEN lower(COALESCE(l.legacy_role, '')) LIKE '%coo%' THEN 'coo'
        ELSE 'ceo'
      END,
      'capability_profile',
      CASE
        WHEN lower(COALESCE(l.legacy_role, '')) LIKE '%coo%' THEN 'vibey_coo'
        ELSE 'vibey_ceo'
      END,
      'capability_domain',
      'shared',
      'model_id',
      'auto',
      'needs_onboarding_chat',
      false
    )
FROM legacy_promoted_agents l
WHERE v.user_id = l.user_id
  AND v.agent_key = 'vibey';

-- Delete existing vibey leader skills first, then insert from legacy.
DELETE FROM public.agent_skills
WHERE user_id IS NOT NULL
  AND agent_key = 'vibey'
  AND skill_key IN ('routing', 'delegation', 'strategy', 'proactive-tasking', 'briefing')
  AND user_id IN (SELECT user_id FROM legacy_promoted_agents);

INSERT INTO public.agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
SELECT s.user_id, 'vibey', s.skill_key, s.name, s.description, s.markdown_content, s.is_enabled
FROM public.agent_skills s
JOIN legacy_promoted_agents l ON l.user_id = s.user_id AND l.legacy_agent_key = s.agent_key
WHERE s.user_id IS NOT NULL
  AND s.skill_key IN ('routing', 'delegation', 'strategy', 'proactive-tasking', 'briefing');

DELETE FROM public.agent_skills s
USING legacy_promoted_agents l
WHERE s.user_id = l.user_id AND s.agent_key = l.legacy_agent_key
  AND s.skill_key IN ('routing', 'delegation', 'strategy', 'proactive-tasking', 'briefing');

-- Repoint runtime references from legacy c_level key to vibey.
UPDATE public.conversations c
SET agent_id = 'vibey'
FROM legacy_promoted_agents l
WHERE c.user_id = l.user_id
  AND c.agent_id = l.legacy_agent_key;

UPDATE public.missions m
SET
  assigned_agent_key = CASE WHEN m.assigned_agent_key = l.legacy_agent_key THEN 'vibey' ELSE m.assigned_agent_key END,
  current_agent_key = CASE WHEN m.current_agent_key = l.legacy_agent_key THEN 'vibey' ELSE m.current_agent_key END
FROM legacy_promoted_agents l
WHERE m.user_id = l.user_id
  AND (m.assigned_agent_key = l.legacy_agent_key OR m.current_agent_key = l.legacy_agent_key);

UPDATE public.mission_subtasks st
SET assigned_agent_key = 'vibey'
FROM public.missions m
JOIN legacy_promoted_agents l
  ON l.user_id = m.user_id
WHERE st.mission_id = m.id
  AND st.assigned_agent_key = l.legacy_agent_key;

-- Remove old leader definitions and registry rows.
DELETE FROM public.agent_definitions d
USING legacy_promoted_agents l
WHERE d.user_id = l.user_id
  AND d.agent_key = l.legacy_agent_key;

DELETE FROM public.agents_registry ar
USING legacy_promoted_agents l
WHERE ar.user_id = l.user_id
  AND ar.agent_key = l.legacy_agent_key;
