-- Forms become space-scoped (each form lives in exactly one space, like docs).
-- Backfill `forms.space_id` for existing rows:
--   1. settings.target_space_id (string in JSONB) when it points to a real space in the same campaign,
--   2. otherwise the campaign's first user space (oldest by created_at) owned by the same user/org,
--   3. otherwise leave NULL (legacy rows surface only in campaign-wide views).
-- Adds a composite index for the new per-space list path.

UPDATE public.forms AS f
SET space_id = s.id
FROM public.spaces AS s
WHERE f.space_id IS NULL
  AND f.settings ? 'target_space_id'
  AND (f.settings ->> 'target_space_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND s.id = (f.settings ->> 'target_space_id')::uuid
  AND s.campaign_id = f.campaign_id;

WITH default_space AS (
  SELECT DISTINCT ON (s.campaign_id, s.user_id, COALESCE(s.org_id, '00000000-0000-0000-0000-000000000000'::uuid))
    s.id,
    s.campaign_id,
    s.user_id,
    s.org_id
  FROM public.spaces AS s
  WHERE s.is_template = false
  ORDER BY
    s.campaign_id,
    s.user_id,
    COALESCE(s.org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    s.created_at ASC
)
UPDATE public.forms AS f
SET space_id = d.id
FROM default_space AS d
WHERE f.space_id IS NULL
  AND f.campaign_id = d.campaign_id
  AND f.user_id = d.user_id
  AND COALESCE(f.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(d.org_id, '00000000-0000-0000-0000-000000000000'::uuid);

-- Second pass: legacy forms with `org_id IS NULL` that live in a campaign whose
-- spaces are all org-scoped. Match by (user_id, campaign_id) only and pick the
-- oldest user-owned space.
WITH default_space_user_only AS (
  SELECT DISTINCT ON (s.campaign_id, s.user_id)
    s.id,
    s.campaign_id,
    s.user_id
  FROM public.spaces AS s
  WHERE s.is_template = false
  ORDER BY
    s.campaign_id,
    s.user_id,
    s.created_at ASC
)
UPDATE public.forms AS f
SET space_id = d.id
FROM default_space_user_only AS d
WHERE f.space_id IS NULL
  AND f.org_id IS NULL
  AND f.campaign_id = d.campaign_id
  AND f.user_id = d.user_id;

CREATE INDEX IF NOT EXISTS idx_forms_space_status
  ON public.forms(space_id, status)
  WHERE space_id IS NOT NULL;
