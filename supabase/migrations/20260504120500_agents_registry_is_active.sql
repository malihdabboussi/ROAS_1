-- Adds soft-deactivate flag for agents. When false, the agent cannot be invoked
-- (chat, missions, channels). Defaults true so all existing agents stay callable.
ALTER TABLE public.agents_registry
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_agents_registry_is_active
  ON public.agents_registry(is_active)
  WHERE is_active = FALSE;
