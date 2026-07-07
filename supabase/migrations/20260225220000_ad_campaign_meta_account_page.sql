-- Store the user's chosen Meta ad account and Facebook page on the ad campaign.
-- These are the defaults shown in campaign settings and pre-populated in the publish modal.

ALTER TABLE ad_campaigns
ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_page_id TEXT;
