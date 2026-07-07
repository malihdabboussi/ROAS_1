-- Phase 7: RLS deny-policies for system-agent content writes.
--
-- Existing policies (`agent_skills_write_own`, etc.) allow users to write
-- rows where user_id = auth.uid(). For system agents (atlas/vibey/hr/viktor)
-- we want to refuse those writes entirely. The check uses
-- `agents_registry.is_system` so future system agents auto-inherit the
-- lockdown.
--
-- Service role bypasses RLS, so the engineering seeder
-- (scripts/seed-system-agents.ts) keeps working.

CREATE OR REPLACE FUNCTION public.is_system_agent_key(p_agent_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents_registry
     WHERE agent_key = p_agent_key AND is_system = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_system_agent_key(text) TO public;

-- agent_skills
DROP POLICY IF EXISTS deny_user_writes_to_system_agents ON public.agent_skills;
CREATE POLICY deny_user_writes_to_system_agents ON public.agent_skills
  AS RESTRICTIVE
  FOR ALL TO public
  USING (NOT public.is_system_agent_key(agent_key))
  WITH CHECK (NOT public.is_system_agent_key(agent_key));

-- agent_definitions
DROP POLICY IF EXISTS deny_user_writes_to_system_agents ON public.agent_definitions;
CREATE POLICY deny_user_writes_to_system_agents ON public.agent_definitions
  AS RESTRICTIVE
  FOR ALL TO public
  USING (NOT public.is_system_agent_key(agent_key))
  WITH CHECK (NOT public.is_system_agent_key(agent_key));

-- agent_skill_resources
DROP POLICY IF EXISTS deny_user_writes_to_system_agents ON public.agent_skill_resources;
CREATE POLICY deny_user_writes_to_system_agents ON public.agent_skill_resources
  AS RESTRICTIVE
  FOR ALL TO public
  USING (NOT public.is_system_agent_key(agent_key))
  WITH CHECK (NOT public.is_system_agent_key(agent_key));
