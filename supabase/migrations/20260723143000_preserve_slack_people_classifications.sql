-- Preserve confirmed team classifications and backfill active portal teammates.
-- Manual classifications are already protected by Slack refresh upserts; this
-- migration repairs records that were previously left inferred.

UPDATE public.channel_members AS cm
SET
  vibey_user_id = om.user_id,
  relationship_kind = 'internal',
  relationship_source = 'manual',
  identity_match_method = 'email',
  identity_match_confidence = 1,
  updated_at = now()
FROM public.org_members AS om
JOIN public.profiles AS p
  ON p.id = om.user_id
WHERE cm.org_id = om.org_id
  AND om.status = 'active'
  AND cm.platform = 'slack'
  AND cm.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(cm.email) = lower(p.email);

UPDATE public.channel_members AS cm
SET
  relationship_kind = 'internal',
  relationship_source = 'manual',
  updated_at = now()
WHERE cm.platform = 'slack'
  AND lower(cm.display_name) IN ('james anderson', 'nefi blanco')
  AND cm.org_id IN (
    SELECT o.id
    FROM public.organizations AS o
    JOIN public.profiles AS owner_profile
      ON owner_profile.id = o.owner_id
    WHERE lower(owner_profile.email) = 'dylan@dylanvanas.com'
  );
