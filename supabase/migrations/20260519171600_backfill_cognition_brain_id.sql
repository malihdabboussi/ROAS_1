-- Backfill legacy user-scope cognition rows to their canonical brain_id.
-- subject_id remains owner metadata only; brain_id is the routing key.

WITH default_user_brains AS (
  SELECT DISTINCT ON (owner_id)
    id AS brain_id,
    owner_id::text AS subject_id
  FROM public.ns_brains
  WHERE scope = 'user'
    AND is_default IS TRUE
    AND org_id IS NULL
  ORDER BY owner_id, created_at ASC
)
UPDATE public.ns_belief_patterns bp
SET
  brain_id = dub.brain_id,
  updated_at = now()
FROM default_user_brains dub
WHERE bp.brain_id IS NULL
  AND bp.subject_id = dub.subject_id;

WITH default_user_brains AS (
  SELECT DISTINCT ON (owner_id)
    id AS brain_id,
    owner_id::text AS subject_id
  FROM public.ns_brains
  WHERE scope = 'user'
    AND is_default IS TRUE
    AND org_id IS NULL
  ORDER BY owner_id, created_at ASC
)
UPDATE public.ns_perspectives p
SET
  brain_id = dub.brain_id,
  updated_at = now()
FROM default_user_brains dub
WHERE p.brain_id IS NULL
  AND p.subject_id = dub.subject_id;
