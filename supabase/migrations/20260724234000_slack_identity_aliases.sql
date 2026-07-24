-- Treat multiple Slack accounts as delivery aliases for one durable person.
-- Strong links are portal user, contact, or managed Person Brain. Display names
-- are intentionally excluded because a name match is not sufficient for trust.

DROP INDEX IF EXISTS public.idx_channel_members_person_brain;

CREATE INDEX IF NOT EXISTS idx_channel_members_person_brain
  ON public.channel_members (person_brain_id)
  WHERE person_brain_id IS NOT NULL;

WITH inherited_relationships AS (
  SELECT
    alias.id,
    min(trusted.relationship_kind) AS relationship_kind
  FROM public.channel_members AS alias
  JOIN public.channel_members AS trusted
    ON trusted.org_id = alias.org_id
   AND trusted.platform = alias.platform
   AND trusted.id <> alias.id
   AND trusted.relationship_source = 'manual'
   AND (
     (alias.vibey_user_id IS NOT NULL AND trusted.vibey_user_id = alias.vibey_user_id)
     OR (alias.contact_id IS NOT NULL AND trusted.contact_id = alias.contact_id)
     OR (
       alias.person_brain_id IS NOT NULL
       AND trusted.person_brain_id = alias.person_brain_id
     )
   )
  WHERE alias.platform = 'slack'
    AND alias.relationship_source = 'inferred'
  GROUP BY alias.id
  HAVING count(DISTINCT trusted.relationship_kind) = 1
)
UPDATE public.channel_members AS alias
SET
  relationship_kind = inherited.relationship_kind,
  relationship_source = 'manual',
  updated_at = now()
FROM inherited_relationships AS inherited
WHERE alias.id = inherited.id;

CREATE OR REPLACE FUNCTION public.create_slack_managed_person_brain(
  p_member_id uuid,
  p_org_id uuid,
  p_owner_id uuid
)
RETURNS TABLE (brain_id uuid, brain_name text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member public.channel_members%ROWTYPE;
  v_brain public.ns_brains%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) <> p_owner_id THEN
    RAISE EXCEPTION 'Managed Person Brain owner must be the authenticated user';
  END IF;

  SELECT *
  INTO v_member
  FROM public.channel_members
  WHERE id = p_member_id
    AND org_id = p_org_id
    AND platform = 'slack'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slack person not found';
  END IF;

  IF v_member.person_brain_id IS NOT NULL THEN
    RETURN QUERY
      SELECT b.id, b.name
      FROM public.ns_brains AS b
      WHERE b.id = v_member.person_brain_id;
    RETURN;
  END IF;

  SELECT b.*
  INTO v_brain
  FROM public.channel_members AS linked
  JOIN public.ns_brains AS b
    ON b.id = linked.person_brain_id
  WHERE linked.org_id = p_org_id
    AND linked.platform = 'slack'
    AND linked.id <> v_member.id
    AND linked.person_brain_id IS NOT NULL
    AND (
      (
        v_member.vibey_user_id IS NOT NULL
        AND linked.vibey_user_id = v_member.vibey_user_id
      )
      OR (
        v_member.contact_id IS NOT NULL
        AND linked.contact_id = v_member.contact_id
      )
    )
  ORDER BY linked.updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.channel_members
    SET person_brain_id = v_brain.id,
        updated_at = now()
    WHERE id = v_member.id;

    RETURN QUERY SELECT v_brain.id, v_brain.name;
    RETURN;
  END IF;

  INSERT INTO public.ns_brains (
    owner_id,
    org_id,
    created_by,
    name,
    description,
    is_default,
    scope,
    icon,
    tags
  ) VALUES (
    p_owner_id,
    p_org_id,
    p_owner_id,
    v_member.display_name || ' Person Brain',
    'Organization-managed knowledge about ' || v_member.display_name || '.',
    false,
    'user',
    'user',
    ARRAY['managed-person', 'slack']::text[]
  )
  RETURNING * INTO v_brain;

  UPDATE public.channel_members
  SET person_brain_id = v_brain.id,
      updated_at = now()
  WHERE id = v_member.id;

  RETURN QUERY SELECT v_brain.id, v_brain.name;
END;
$$;

COMMENT ON INDEX public.idx_channel_members_person_brain IS
  'Allows multiple Slack delivery identities to share one durable managed Person Brain.';

NOTIFY pgrst, 'reload schema';
