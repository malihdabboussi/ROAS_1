-- Add ad_format, video_url, and carousel_cards columns to the ads table
-- to support SINGLE_IMAGE (default), SINGLE_VIDEO, and CAROUSEL creative types.

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS ad_format text NOT NULL DEFAULT 'SINGLE_IMAGE',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS carousel_cards jsonb;

COMMENT ON COLUMN ads.ad_format IS 'Creative format: SINGLE_IMAGE | SINGLE_VIDEO | CAROUSEL';
COMMENT ON COLUMN ads.video_url IS 'Source video URL when ad_format = SINGLE_VIDEO';
COMMENT ON COLUMN ads.carousel_cards IS 'Array of carousel card objects when ad_format = CAROUSEL: [{image_url, headline, description, link, image_asset_id}]';
