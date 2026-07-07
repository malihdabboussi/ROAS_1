-- Backfill Vibey as a real system agent row per user.
-- Idempotent: safe to run multiple times.

WITH candidate_users AS (
  SELECT DISTINCT p.id AS user_id
  FROM public.profiles p
  UNION
  SELECT DISTINCT ar.user_id
  FROM public.agents_registry ar
)
INSERT INTO public.agents_registry (
  user_id,
  agent_key,
  name,
  role,
  skills,
  status,
  config,
  level,
  image_url,
  stats,
  sort_order,
  user_brain_access
)
SELECT
  cu.user_id,
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
  NULL,
  '{}'::jsonb,
  0,
  true
FROM candidate_users cu
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agents_registry ar
  WHERE ar.user_id = cu.user_id
    AND ar.agent_key = 'vibey'
);
