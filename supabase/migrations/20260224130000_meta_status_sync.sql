-- Meta status sync columns for campaigns/ad sets/ads
-- Store Meta canonical effective status separately from local Vibey status.

ALTER TABLE ad_campaigns
ADD COLUMN IF NOT EXISTS meta_effective_status TEXT;

ALTER TABLE ad_sets
ADD COLUMN IF NOT EXISTS meta_effective_status TEXT;

ALTER TABLE ads
ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
ADD COLUMN IF NOT EXISTS meta_effective_status TEXT;

-- Backfill structured meta_ad_id from legacy metadata JSON.
UPDATE ads
SET meta_ad_id = metadata->>'meta_ad_id'
WHERE meta_ad_id IS NULL
  AND metadata ? 'meta_ad_id'
  AND COALESCE(metadata->>'meta_ad_id', '') <> '';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_meta_campaign_id ON ad_campaigns(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_meta_adset_id ON ad_sets(meta_adset_id);
CREATE INDEX IF NOT EXISTS idx_ads_meta_ad_id ON ads(meta_ad_id);
