-- Ads table
-- Stores generated ad creatives (e.g., Meta single-image ads) as campaign artifacts.

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Ad targeting context
  platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta')),
  placement TEXT NOT NULL DEFAULT 'feed' CHECK (placement IN ('feed', 'story')),

  -- Creative fields
  primary_text TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  description TEXT,

  -- CTA + destination
  cta_type TEXT,
  cta_text TEXT,
  destination_url TEXT NOT NULL DEFAULT '',
  display_link TEXT,

  -- Image (stored both as FK to media_assets and as a URL for quick preview)
  image_url TEXT,
  image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

  -- Arbitrary metadata (prompt, aspect ratio, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ads_user_id ON ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads(created_at DESC);

-- RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ads" ON ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ads" ON ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ads" ON ads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ads" ON ads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access ads" ON ads FOR ALL USING (auth.role() = 'service_role');

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_ads_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ads_updated_at ON ads;
CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION update_ads_timestamp();

-- Realtime publication (for Studio Artifacts live refresh)
ALTER PUBLICATION supabase_realtime ADD TABLE ads;
;
