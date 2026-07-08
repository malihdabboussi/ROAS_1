-- Repair: ns_belief_patterns / ns_perspectives are missing the brain_id column on
-- some environments (the origin migration was skipped, so later index/backfill
-- migrations that assume brain_id silently no-op'd). Cognition is queried by
-- brain_id (graph, patterns, perspectives endpoints), so a missing column 500s
-- the Brain page. Add the column, backfill from the default user brain, index it.

ALTER TABLE public.ns_belief_patterns
  ADD COLUMN IF NOT EXISTS brain_id uuid REFERENCES public.ns_brains(id) ON DELETE CASCADE;

ALTER TABLE public.ns_perspectives
  ADD COLUMN IF NOT EXISTS brain_id uuid REFERENCES public.ns_brains(id) ON DELETE CASCADE;

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
SET brain_id = dub.brain_id,
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
SET brain_id = dub.brain_id,
    updated_at = now()
FROM default_user_brains dub
WHERE p.brain_id IS NULL
  AND p.subject_id = dub.subject_id;

CREATE INDEX IF NOT EXISTS idx_ns_belief_patterns_brain ON public.ns_belief_patterns (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_perspectives_brain ON public.ns_perspectives (brain_id);

NOTIFY pgrst, 'reload schema';
