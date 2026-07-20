-- Give each Slack-only identity an optional organization-managed User Brain.
-- Customer and campaign knowledge remain relationship links, not the person's identity store.

ALTER TABLE public.channel_members
  ADD COLUMN IF NOT EXISTS person_brain_id uuid REFERENCES public.ns_brains(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_members_person_brain
  ON public.channel_members (person_brain_id)
  WHERE person_brain_id IS NOT NULL;

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
      FROM public.ns_brains b
      WHERE b.id = v_member.person_brain_id;
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

COMMENT ON COLUMN public.channel_members.person_brain_id IS
  'Organization-managed non-default User Brain for a Slack identity. Separate from Customer Brain and a mapped portal user private Brain.';

NOTIFY pgrst, 'reload schema';
