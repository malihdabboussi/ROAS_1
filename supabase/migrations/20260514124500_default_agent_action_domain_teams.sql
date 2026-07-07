-- Ensure new signups receive policy teams and action-domain baseline grants.
-- This complements the older one-time team backfills, which do not run for future users.

CREATE OR REPLACE FUNCTION public.ensure_default_agent_policy_teams_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_general_team_id uuid;
  v_management_team_id uuid;
BEGIN
  INSERT INTO public.agent_teams (user_id, org_id, name, color, icon, is_system)
  VALUES (NEW.id, NULL, 'General', 'muted', 'users', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.agent_teams (user_id, org_id, name, color, icon, is_system)
  VALUES (NEW.id, NULL, 'Management', 'blue', 'briefcase', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_general_team_id
  FROM public.agent_teams
  WHERE user_id = NEW.id
    AND org_id IS NULL
    AND name = 'General'
  LIMIT 1;

  SELECT id INTO v_management_team_id
  FROM public.agent_teams
  WHERE user_id = NEW.id
    AND org_id IS NULL
    AND name = 'Management'
  LIMIT 1;

  IF v_general_team_id IS NOT NULL THEN
    INSERT INTO public.agent_team_members (team_id, user_id, added_by)
    VALUES (v_general_team_id, NEW.id, NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
    VALUES
      (v_general_team_id, 'action_domain', 'read_campaign', 'allow'),
      (v_general_team_id, 'action_domain', 'read_marketing_artifacts', 'allow'),
      (v_general_team_id, 'action_domain', 'manage_tasks_missions', 'allow'),
      (v_general_team_id, 'action_domain', 'communicate', 'allow')
    ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

    UPDATE public.agents_registry
    SET team_id = COALESCE(team_id, v_general_team_id)
    WHERE user_id = NEW.id
      AND org_id IS NULL
      AND team_id IS NULL;
  END IF;

  IF v_management_team_id IS NOT NULL THEN
    INSERT INTO public.agent_team_members (team_id, user_id, added_by)
    VALUES (v_management_team_id, NEW.id, NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
    VALUES
      (v_management_team_id, 'action_domain', 'read_campaign', 'allow'),
      (v_management_team_id, 'action_domain', 'edit_campaign', 'allow'),
      (v_management_team_id, 'action_domain', 'manage_tasks_missions', 'allow'),
      (v_management_team_id, 'action_domain', 'manage_agents', 'allow'),
      (v_management_team_id, 'action_domain', 'communicate', 'allow'),
      (v_management_team_id, 'action_domain', 'use_integrations', 'allow')
    ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

    UPDATE public.agents_registry
    SET team_id = v_management_team_id
    WHERE user_id = NEW.id
      AND org_id IS NULL
      AND agent_key = 'vibey';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_ensure_default_agent_policy_teams_for_user ON auth.users;
CREATE TRIGGER zzz_ensure_default_agent_policy_teams_for_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_agent_policy_teams_for_user();

REVOKE ALL ON FUNCTION public.ensure_default_agent_policy_teams_for_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_agent_policy_teams_for_user() TO service_role;
