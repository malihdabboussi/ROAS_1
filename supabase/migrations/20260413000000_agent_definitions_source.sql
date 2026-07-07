-- Add source column to agent_definitions to distinguish system / library / custom rows.
-- system  = core platform agents (vibey, viktor, atlas, hr)
-- library = pre-made hireable agents (ivy, lux, niko, etc.)
-- custom  = HR-created user/org-specific agents
ALTER TABLE public.agent_definitions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'custom';

-- Backfill known system agents that already have global rows
UPDATE public.agent_definitions
SET source = 'system'
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'viktor');
