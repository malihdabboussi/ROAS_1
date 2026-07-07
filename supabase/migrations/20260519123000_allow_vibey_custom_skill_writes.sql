-- Allow user/org-scoped custom Vibey skills while keeping engineering-owned
-- skill content locked for the agents that are not user-writeable in app code.

CREATE OR REPLACE FUNCTION public.is_skill_write_locked_agent_key(p_agent_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_agent_key IN ('hr', 'viktor', 'widget_builder', 'atlas', 'brain_scholar');
$$;

REVOKE ALL ON FUNCTION public.is_skill_write_locked_agent_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_skill_write_locked_agent_key(text) TO authenticated;

DROP POLICY IF EXISTS deny_user_writes_to_system_agents ON public.agent_skills;
DROP POLICY IF EXISTS deny_user_insert_to_system_agent_skills ON public.agent_skills;
DROP POLICY IF EXISTS deny_user_update_to_system_agent_skills ON public.agent_skills;
DROP POLICY IF EXISTS deny_user_delete_to_system_agent_skills ON public.agent_skills;

CREATE POLICY deny_user_insert_to_skill_write_locked_agent_skills
  ON public.agent_skills
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (NOT public.is_skill_write_locked_agent_key(agent_key));

CREATE POLICY deny_user_update_to_skill_write_locked_agent_skills
  ON public.agent_skills
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (NOT public.is_skill_write_locked_agent_key(agent_key))
  WITH CHECK (NOT public.is_skill_write_locked_agent_key(agent_key));

CREATE POLICY deny_user_delete_to_skill_write_locked_agent_skills
  ON public.agent_skills
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (NOT public.is_skill_write_locked_agent_key(agent_key));

DROP POLICY IF EXISTS deny_user_writes_to_system_agents ON public.agent_skill_resources;
DROP POLICY IF EXISTS deny_user_insert_to_system_agent_skill_resources ON public.agent_skill_resources;
DROP POLICY IF EXISTS deny_user_update_to_system_agent_skill_resources ON public.agent_skill_resources;
DROP POLICY IF EXISTS deny_user_delete_to_system_agent_skill_resources ON public.agent_skill_resources;

CREATE POLICY deny_user_insert_to_skill_write_locked_agent_skill_resources
  ON public.agent_skill_resources
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (NOT public.is_skill_write_locked_agent_key(agent_key));

CREATE POLICY deny_user_update_to_skill_write_locked_agent_skill_resources
  ON public.agent_skill_resources
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (NOT public.is_skill_write_locked_agent_key(agent_key))
  WITH CHECK (NOT public.is_skill_write_locked_agent_key(agent_key));

CREATE POLICY deny_user_delete_to_skill_write_locked_agent_skill_resources
  ON public.agent_skill_resources
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (NOT public.is_skill_write_locked_agent_key(agent_key));
