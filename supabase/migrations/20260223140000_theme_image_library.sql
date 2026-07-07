ALTER TABLE branding_themes
  ADD COLUMN IF NOT EXISTS headshot_images JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS product_images JSONB DEFAULT '[]';

COMMENT ON COLUMN branding_themes.headshot_images IS 'Array of {asset_id, name, description} objects for user headshot photos';
COMMENT ON COLUMN branding_themes.product_images IS 'Array of {asset_id, name, description} objects for product/brand images';
