-- Replace flat unique constraint with org-scoped partial unique indexes
-- Mirrors the pattern used in agents_registry

-- Drop the old constraint
ALTER TABLE public.agent_channels
  DROP CONSTRAINT IF EXISTS agent_channels_user_id_agent_key_channel_type_key;

-- Personal channels: unique per (user_id, agent_key, channel_type) when no org
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_personal_unique
  ON public.agent_channels (user_id, agent_key, channel_type)
  WHERE org_id IS NULL;

-- Org channels: unique per (org_id, agent_key, channel_type) within an org
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_org_unique
  ON public.agent_channels (org_id, agent_key, channel_type)
  WHERE org_id IS NOT NULL;
