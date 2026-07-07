-- Keep database RLS aligned with BrainPermissionsService:
-- an explicit train-level brain share grants train-level access.

CREATE OR REPLACE FUNCTION public.can_access_brain(
  p_brain_id uuid,
  p_min_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brain record;
  v_role text;
  v_required integer := public.brain_share_level_weight(p_min_level);
  v_baseline integer := 0;
  v_share integer := 0;
  v_effective integer := 0;
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN true;
  END IF;

  SELECT id, owner_id, org_id, scope, agent_id, created_by
  INTO v_brain
  FROM public.ns_brains
  WHERE id = p_brain_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_brain.org_id IS NULL THEN
    IF v_brain.owner_id = (SELECT auth.uid()) THEN
      v_baseline := 3;
    END IF;
  ELSE
    SELECT role
    INTO v_role
    FROM public.org_members
    WHERE org_id = v_brain.org_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
    LIMIT 1;

    IF v_role IS NULL OR v_role = 'viewer' THEN
      RETURN false;
    END IF;

    IF v_role IN ('owner', 'admin') THEN
      v_baseline := 3;
    ELSIF v_brain.scope = 'agent' THEN
      IF v_brain.created_by = (SELECT auth.uid()) OR v_brain.owner_id = (SELECT auth.uid()) THEN
        v_baseline := 3;
      ELSE
        v_baseline := 2;
      END IF;
    ELSIF v_brain.scope IN ('customer', 'company') THEN
      v_baseline := 2;
    ELSIF v_brain.scope = 'user' THEN
      IF v_brain.owner_id = (SELECT auth.uid()) THEN
        v_baseline := 3;
      END IF;
    ELSE
      v_baseline := 2;
    END IF;
  END IF;

  SELECT COALESCE(MAX(public.brain_share_level_weight(bs.level)), 0)
  INTO v_share
  FROM public.brain_shares bs
  LEFT JOIN public.agent_team_members tm
    ON bs.entity_type = 'team'
   AND tm.team_id = bs.entity_id
   AND tm.user_id = (SELECT auth.uid())
  WHERE bs.brain_id = p_brain_id
    AND (
      (bs.entity_type = 'user' AND bs.entity_id = (SELECT auth.uid()))
      OR (bs.entity_type = 'org' AND v_brain.org_id IS NOT NULL AND bs.entity_id = v_brain.org_id)
      OR (bs.entity_type = 'team' AND tm.user_id IS NOT NULL)
    );

  v_effective := GREATEST(v_baseline, v_share);

  RETURN v_effective >= v_required;
END;
$$;
