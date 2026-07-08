-- agent-sync materialization selects archetype_filter from agent_definitions;
-- ROAS production was missing this column, blocking runtime agent sync and chat.

ALTER TABLE public.agent_definitions
  ADD COLUMN IF NOT EXISTS archetype_filter text[] DEFAULT NULL;

COMMENT ON COLUMN public.agent_definitions.archetype_filter IS
  'Optional archetype allowlist for definition rows; NULL means all archetypes.';
