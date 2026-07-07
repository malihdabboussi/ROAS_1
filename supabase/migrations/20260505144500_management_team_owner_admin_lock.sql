-- ============================================================
-- MANAGEMENT TEAM: lock owners + admins as members
-- - Backfill any missing owners/admins into the org's Management team.
-- - Trigger keeps Management membership in sync as org_members
--   are added or promoted to owner/admin.
-- (Removal guard lives in the backend service for clearer 403.)
-- ============================================================

-- 1) Backfill: every active org owner/admin must be a member of their org's Management team.

INSERT INTO public.agent_team_members (team_id, user_id, added_by)
SELECT t.id, om.user_id, om.user_id
FROM public.agent_teams t
JOIN public.org_members om ON om.org_id = t.org_id
WHERE t.is_system
  AND t.name = 'Management'
  AND t.org_id IS NOT NULL
  AND om.status = 'active'
  AND om.role IN ('owner', 'admin')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 2) Trigger: keep Management membership aligned with org_members owner/admin role.

CREATE OR REPLACE FUNCTION public.tg_sync_management_team_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' AND NEW.role IN ('owner', 'admin') THEN
      SELECT id INTO v_team_id
      FROM public.agent_teams
      WHERE org_id = NEW.org_id AND is_system AND name = 'Management'
      LIMIT 1;
      IF v_team_id IS NOT NULL THEN
        INSERT INTO public.agent_team_members (team_id, user_id, added_by)
        VALUES (v_team_id, NEW.user_id, NEW.user_id)
        ON CONFLICT (team_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_management_team_member ON public.org_members;
CREATE TRIGGER trg_sync_management_team_member
AFTER INSERT OR UPDATE OF role, status ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.tg_sync_management_team_member();
