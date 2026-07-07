-- ============================================================================
-- Campaign Brain Support
-- Adds campaign_id to ns_brains so each campaign can have its own brain
-- for narrative page organization. Auto-created lazily on first ingestion.
-- ============================================================================

ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_brains_campaign
  ON ns_brains (campaign_id) WHERE campaign_id IS NOT NULL;
