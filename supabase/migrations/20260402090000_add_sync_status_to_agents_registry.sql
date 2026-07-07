-- sync_status: tracks whether an agent's identity files + gateway config
-- have been synced after creation. Blocks chat input until 'ready'.
-- Default 'ready' so all existing agents are unaffected.

ALTER TABLE public.agents_registry
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'ready';

ALTER TABLE public.agents_registry
  DROP CONSTRAINT IF EXISTS agents_registry_sync_status_check;

ALTER TABLE public.agents_registry
  ADD CONSTRAINT agents_registry_sync_status_check
  CHECK (sync_status IN ('pending', 'syncing', 'ready', 'failed'));
