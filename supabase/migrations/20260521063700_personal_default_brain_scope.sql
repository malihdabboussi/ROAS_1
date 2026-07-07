-- Phase 1: personal default user brains must never be org-scoped.

UPDATE public.ns_brains
SET org_id = NULL,
    scope = 'user',
    updated_at = now()
WHERE scope = 'user'
  AND is_default IS TRUE
  AND org_id IS NOT NULL;

UPDATE public.ns_brains
SET scope = 'user',
    updated_at = now()
WHERE is_default IS TRUE
  AND scope IS DISTINCT FROM 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ns_brains_default_user_personal_check'
      AND conrelid = 'public.ns_brains'::regclass
  ) THEN
    ALTER TABLE public.ns_brains
      ADD CONSTRAINT ns_brains_default_user_personal_check
      CHECK (NOT (scope = 'user' AND is_default IS TRUE AND org_id IS NOT NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_brains_default_user_personal
  ON public.ns_brains (owner_id)
  WHERE scope = 'user' AND is_default IS TRUE AND org_id IS NULL;

NOTIFY pgrst, 'reload schema';
