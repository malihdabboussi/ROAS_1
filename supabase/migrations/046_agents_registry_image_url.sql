-- 046: Persist agent portrait URL in agents_registry

ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS image_url TEXT;
