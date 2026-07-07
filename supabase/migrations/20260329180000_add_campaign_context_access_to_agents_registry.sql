ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS campaign_context_access BOOLEAN DEFAULT true;
