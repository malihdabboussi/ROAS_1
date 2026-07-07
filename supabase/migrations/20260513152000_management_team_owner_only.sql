-- ============================================================
-- MANAGEMENT TEAM: only org owners are auto-locked as members
-- - Replaces tg_sync_management_team_member from
--   20260505144500_management_team_owner_admin_lock.sql so admins
--   are no longer auto-added on insert/role change.
-- - Backend removal guard is updated separately to only block
--   owners from being removed.
-- - Existing admin rows in Management are left intact and can now
--   be removed via the UI (no longer protected).
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_sync_management_team_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' AND NEW.role = 'owner' THEN
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
