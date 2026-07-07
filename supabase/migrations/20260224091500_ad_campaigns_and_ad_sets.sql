-- Ad Campaigns table
-- Mirrors Meta campaign structure: objective, status, budget type.
-- Each ad_campaign belongs to a Vibey campaign.

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  name TEXT NOT NULL DEFAULT 'Untitled Campaign',
  objective TEXT NOT NULL DEFAULT 'OUTCOME_TRAFFIC'
    CHECK (objective IN (
      'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS',
      'OUTCOME_SALES', 'OUTCOME_TRAFFIC', 'OUTCOME_APP_PROMOTION'
    )),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  budget_type TEXT NOT NULL DEFAULT 'ABO'
    CHECK (budget_type IN ('CBO', 'ABO')),
  special_ad_categories JSONB NOT NULL DEFAULT '[]'::jsonb,

  meta_campaign_id TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user_id ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_campaign_id ON ad_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_at ON ad_campaigns(created_at DESC);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ad_campaigns" ON ad_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ad_campaigns" ON ad_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ad_campaigns" ON ad_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ad_campaigns" ON ad_campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access ad_campaigns" ON ad_campaigns FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_ad_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_ad_campaigns_timestamp();

ALTER PUBLICATION supabase_realtime ADD TABLE ad_campaigns;

-- Ad Sets table
-- Mirrors Meta ad set structure: budget, targeting, optimization, schedule.

CREATE TABLE IF NOT EXISTS ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ad_campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL DEFAULT 'Untitled Ad Set',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),

  daily_budget INTEGER,
  lifetime_budget INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,

  optimization_goal TEXT NOT NULL DEFAULT 'LINK_CLICKS'
    CHECK (optimization_goal IN (
      'REACH', 'IMPRESSIONS', 'LINK_CLICKS',
      'LANDING_PAGE_VIEWS', 'LEAD_GENERATION', 'CONVERSIONS'
    )),
  billing_event TEXT NOT NULL DEFAULT 'IMPRESSIONS'
    CHECK (billing_event IN ('IMPRESSIONS', 'LINK_CLICKS')),

  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,

  meta_adset_id TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_sets_user_id ON ad_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_ad_campaign_id ON ad_sets(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_created_at ON ad_sets(created_at DESC);

ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ad_sets" ON ad_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ad_sets" ON ad_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ad_sets" ON ad_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ad_sets" ON ad_sets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access ad_sets" ON ad_sets FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_ad_sets_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_sets_updated_at ON ad_sets;
CREATE TRIGGER ad_sets_updated_at
  BEFORE UPDATE ON ad_sets
  FOR EACH ROW EXECUTE FUNCTION update_ad_sets_timestamp();

ALTER PUBLICATION supabase_realtime ADD TABLE ad_sets;

-- Add ad_set_id FK to ads table (nullable for ungrouped ads)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_set_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON ads(ad_set_id);

-- Add reels to placement check (was missing)
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_placement_check;
ALTER TABLE ads ADD CONSTRAINT ads_placement_check CHECK (placement IN ('feed', 'story', 'reels'));
