-- Atlas/Vibey/HR/Viktor — system agent lockdown, Phase 1 of N
-- Adds `is_system` flag to `agents_registry` so RLS, services, and UI can key
-- off a single source of truth instead of hard-coded SYSTEM_AGENT_KEYS.

ALTER TABLE public.agents_registry
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

UPDATE public.agents_registry
   SET is_system = true
 WHERE agent_key IN ('atlas', 'vibey', 'viktor', 'hr');

CREATE INDEX IF NOT EXISTS agents_registry_is_system_idx
  ON public.agents_registry (is_system)
  WHERE is_system = true;

COMMENT ON COLUMN public.agents_registry.is_system IS
  'Whether this agent is engineering-owned (locked content; users may toggle skills via agent_overrides but cannot edit content).';
