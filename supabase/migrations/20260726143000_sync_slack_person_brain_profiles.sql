-- Keep organization-managed Person Brain profile metadata aligned with the
-- immutable Slack identity linked through channel_members.person_brain_id.
-- Names are never used to join people, so similarly named contacts remain
-- separate unless they already share a trusted durable identity link.

CREATE OR REPLACE FUNCTION public.sync_slack_managed_person_brain_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_display_name text;
  previous_avatar_url text;
BEGIN
  IF NEW.person_brain_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    previous_display_name := OLD.display_name;
    previous_avatar_url := OLD.avatar_url;
  END IF;

  UPDATE public.ns_brains AS brain
  SET
    name = CASE
      WHEN brain.name =
        COALESCE(previous_display_name, NEW.display_name) || ' Person Brain'
        OR brain.name = 'Person Brain'
      THEN NEW.display_name || ' Person Brain'
      ELSE brain.name
    END,
    description = CASE
      WHEN brain.description =
        'Organization-managed knowledge about '
        || COALESCE(previous_display_name, NEW.display_name)
        || '.'
      THEN 'Organization-managed knowledge about ' || NEW.display_name || '.'
      ELSE brain.description
    END,
    image_url = CASE
      WHEN brain.image_url IS NULL
        OR (
          previous_avatar_url IS NOT NULL
          AND brain.image_url = previous_avatar_url
        )
      THEN NEW.avatar_url
      ELSE brain.image_url
    END,
    updated_at = now()
  WHERE brain.id = NEW.person_brain_id
    AND brain.scope = 'user'
    AND brain.tags @> ARRAY['managed-person']::text[];

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_slack_managed_person_brain_profile_insert
  ON public.channel_members;

CREATE TRIGGER trg_sync_slack_managed_person_brain_profile_insert
AFTER INSERT
ON public.channel_members
FOR EACH ROW
WHEN (
  NEW.platform = 'slack'
  AND NEW.person_brain_id IS NOT NULL
)
EXECUTE FUNCTION public.sync_slack_managed_person_brain_profile();

DROP TRIGGER IF EXISTS trg_sync_slack_managed_person_brain_profile_update
  ON public.channel_members;

CREATE TRIGGER trg_sync_slack_managed_person_brain_profile_update
AFTER UPDATE OF display_name, avatar_url, person_brain_id
ON public.channel_members
FOR EACH ROW
WHEN (
  NEW.platform = 'slack'
  AND NEW.person_brain_id IS NOT NULL
  AND (
    OLD.display_name IS DISTINCT FROM NEW.display_name
    OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
    OR OLD.person_brain_id IS DISTINCT FROM NEW.person_brain_id
  )
)
EXECUTE FUNCTION public.sync_slack_managed_person_brain_profile();

WITH canonical_member AS (
  SELECT DISTINCT ON (member.person_brain_id)
    member.person_brain_id,
    member.display_name,
    member.avatar_url
  FROM public.channel_members AS member
  WHERE member.platform = 'slack'
    AND member.person_brain_id IS NOT NULL
  ORDER BY
    member.person_brain_id,
    (member.vibey_user_id IS NOT NULL) DESC,
    member.last_seen_at DESC NULLS LAST,
    member.updated_at DESC
)
UPDATE public.ns_brains AS brain
SET
  name = canonical.display_name || ' Person Brain',
  description = 'Organization-managed knowledge about ' || canonical.display_name || '.',
  image_url = COALESCE(brain.image_url, canonical.avatar_url),
  updated_at = now()
FROM canonical_member AS canonical
WHERE brain.id = canonical.person_brain_id
  AND brain.scope = 'user'
  AND brain.tags @> ARRAY['managed-person']::text[]
  AND (
    brain.name = 'Person Brain'
    OR (
      brain.name LIKE '% Person Brain'
      AND brain.description =
        'Organization-managed knowledge about '
        || left(brain.name, length(brain.name) - length(' Person Brain'))
        || '.'
    )
  );

COMMENT ON FUNCTION public.sync_slack_managed_person_brain_profile() IS
  'Synchronizes auto-managed Person Brain name, description, and avatar after the same immutable Slack identity changes profile metadata.';

NOTIFY pgrst, 'reload schema';
