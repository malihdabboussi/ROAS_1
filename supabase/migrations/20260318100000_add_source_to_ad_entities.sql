-- Add columns needed for Meta ad sync to ad_campaigns, ad_sets, ads
-- source: 'vibey' (created in app) or 'meta' (synced from platform)

-- ═══════════════════════════════════════════════════════════════════
-- ad_campaigns
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'vibey';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS meta_ad_account_id text;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS meta_effective_status text;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS daily_budget numeric;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS lifetime_budget numeric;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_source ON ad_campaigns(source);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_meta_ad_account ON ad_campaigns(meta_ad_account_id);

-- ═══════════════════════════════════════════════════════════════════
-- ad_sets
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'vibey';
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS meta_effective_status text;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_sets_source ON ad_sets(source);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON ad_sets(campaign_id);

-- Widen CHECK constraints: Meta sends values outside the original narrow lists
ALTER TABLE ad_sets DROP CONSTRAINT IF EXISTS ad_sets_optimization_goal_check;
ALTER TABLE ad_sets DROP CONSTRAINT IF EXISTS ad_sets_billing_event_check;

-- ═══════════════════════════════════════════════════════════════════
-- ads
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE ads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'vibey';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS meta_ad_id text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS meta_effective_status text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS name text;

CREATE INDEX IF NOT EXISTS idx_ads_source ON ads(source);
CREATE INDEX IF NOT EXISTS idx_ads_meta_ad_id ON ads(meta_ad_id);
