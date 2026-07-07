-- Access is policy-driven via agent_team_grants / agent_overrides.
-- These legacy columns could drift from the Access UI and grant stale runtime access.
ALTER TABLE public.agents_registry
  DROP COLUMN IF EXISTS user_brain_access,
  DROP COLUMN IF EXISTS campaign_context_access;
