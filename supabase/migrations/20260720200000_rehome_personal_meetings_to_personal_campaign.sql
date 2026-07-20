-- Ensure every user with a personal-account Meetings / Personal Dashboard space
-- also has a Personal system campaign, then rehome those spaces onto it.
-- Org Personal Dashboards (org_id set) are left untouched.

INSERT INTO public.campaigns (user_id, name, campaign_type, config, org_id, status)
SELECT DISTINCT
  s.user_id,
  'Personal',
  'get-more-leads',
  jsonb_build_object(
    'system_kind', 'personal',
    'isPinned', true,
    'isSystem', true,
    'icon', 'house'
  ),
  NULL::uuid,
  'active'
FROM public.spaces s
WHERE s.org_id IS NULL
  AND (
    s.space_kind = 'personal_dashboard'
    OR lower(coalesce(s.title, '')) IN ('meetings', 'personal dashboard')
    OR coalesce(s.schema->>'icon', '') = 'video'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.user_id = s.user_id
      AND c.org_id IS NULL
      AND coalesce(c.config->>'system_kind', '') = 'personal'
      AND c.deleted_at IS NULL
      AND coalesce(c.status, '') <> 'archived'
  );

UPDATE public.spaces s
SET campaign_id = c.id,
    updated_at = now()
FROM public.campaigns c
WHERE s.user_id = c.user_id
  AND s.org_id IS NULL
  AND c.org_id IS NULL
  AND coalesce(c.config->>'system_kind', '') = 'personal'
  AND c.deleted_at IS NULL
  AND coalesce(c.status, '') <> 'archived'
  AND (
    s.space_kind = 'personal_dashboard'
    OR lower(coalesce(s.title, '')) IN ('meetings', 'personal dashboard')
    OR coalesce(s.schema->>'icon', '') = 'video'
  )
  AND (s.campaign_id IS DISTINCT FROM c.id);
