-- Add generating_avatar_at to agents_registry to gate concurrent avatar backfill
ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS generating_avatar_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN agents_registry.generating_avatar_at IS
  'Set to now() when avatar generation is in flight; cleared to NULL once image_url is written. Used to prevent the backfill loop from spawning duplicate generations.';
