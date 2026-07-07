-- Jaime/HR owns agent management and custom skill creation.
-- Keep engineering-owned platform skill content protected for the remaining
-- locked system agents, but allow HR-scoped custom skill rows/resources.

CREATE OR REPLACE FUNCTION public.is_skill_write_locked_agent_key(p_agent_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_agent_key IN ('viktor', 'widget_builder', 'atlas', 'brain_scholar');
$$;

REVOKE ALL ON FUNCTION public.is_skill_write_locked_agent_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_skill_write_locked_agent_key(text) TO authenticated;
