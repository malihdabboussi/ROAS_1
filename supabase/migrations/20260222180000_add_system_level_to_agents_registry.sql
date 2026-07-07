ALTER TABLE public.agents_registry
  DROP CONSTRAINT IF EXISTS agents_registry_level_check;

ALTER TABLE public.agents_registry
  ADD CONSTRAINT agents_registry_level_check
  CHECK (level IN ('c_level', 'manager', 'employee', 'system'));

UPDATE public.agents_registry
SET level = 'system'
WHERE agent_key = 'hr';
