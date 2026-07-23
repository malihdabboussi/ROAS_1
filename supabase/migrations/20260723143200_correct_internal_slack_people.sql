-- Correct known internal teammates whose Slack display names include role
-- suffixes. Scope the repair to Dylan's organization and persist the result as
-- a manual classification so later Slack refreshes cannot infer it away.

UPDATE public.channel_members AS cm
SET
  relationship_kind = 'internal',
  relationship_source = 'manual',
  updated_at = now()
WHERE cm.platform = 'slack'
  AND (
    lower(cm.display_name) LIKE 'james anderson%'
    OR lower(cm.display_name) LIKE 'nefi blanco%'
  )
  AND cm.org_id IN (
    SELECT o.id
    FROM public.organizations AS o
    JOIN public.profiles AS owner_profile
      ON owner_profile.id = o.owner_id
    WHERE lower(owner_profile.email) = 'dylan@dylanvanas.com'
  );
