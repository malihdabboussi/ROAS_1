-- UTM tracking and ad attribution columns

-- 1. ads: tracking_url for UTM-appended destination
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 2. visitors_page_views: ad-level and ad-set-level UTM fields
ALTER TABLE visitors_page_views ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE visitors_page_views ADD COLUMN IF NOT EXISTS utm_adset TEXT;

-- 3. leads: direct ad attribution FKs
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_set_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES ads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_ad_campaign_id ON leads(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_ad_set_id ON leads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_leads_ad_id ON leads(ad_id);
