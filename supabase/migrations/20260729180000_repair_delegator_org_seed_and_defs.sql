-- Repair Delegator install for environments that applied the first seed with a
-- hardcoded non-ROAS org id and a non-colliding NULL-org definition upsert.
BEGIN;

DELETE FROM public.agent_definitions d
USING public.agent_definitions keep
WHERE d.agent_key = 'delegator'
  AND d.user_id IS NULL
  AND d.org_id IS NULL
  AND keep.agent_key = 'delegator'
  AND keep.user_id IS NULL
  AND keep.org_id IS NULL
  AND keep.file_name = d.file_name
  AND keep.created_at < d.created_at;

UPDATE public.agents_registry
SET
  name = 'Delegator',
  role = 'Delegation Manager',
  skills = '["delegation-desk","vibey-api"]'::jsonb,
  status = 'idle',
  level = 'system',
  config = '{"capability_profile":"system_delegation","capability_domain":"operations","platform_managed":true,"model_id":"auto"}'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NOT NULL
  AND agent_key = 'delegator';

INSERT INTO public.agents_registry (
  user_id,
  org_id,
  agent_key,
  name,
  role,
  skills,
  status,
  level,
  config,
  is_system,
  is_active
)
SELECT
  NULL,
  o.id,
  'delegator',
  'Delegator',
  'Delegation Manager',
  '["delegation-desk","vibey-api"]'::jsonb,
  'idle',
  'system',
  '{"capability_profile":"system_delegation","capability_domain":"operations","platform_managed":true,"model_id":"auto"}'::jsonb,
  true,
  true
FROM public.organizations o
WHERE EXISTS (
  SELECT 1
  FROM public.agents_registry vibey
  WHERE vibey.org_id = o.id
    AND vibey.user_id IS NULL
    AND vibey.agent_key = 'vibey'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.agents_registry existing
  WHERE existing.org_id = o.id
    AND existing.user_id IS NULL
    AND existing.agent_key = 'delegator'
);

COMMIT;
