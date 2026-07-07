-- Create media_assets table for unified file management
-- Stores metadata for all user files (generated images, uploads, etc.)

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- File identity
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL,
  bucket_name TEXT NOT NULL DEFAULT 'media',
  
  -- File metadata
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(255) NOT NULL DEFAULT 'image/png',
  width INTEGER,
  height INTEGER,
  
  -- Organization
  asset_type TEXT NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'document', 'video', 'audio', 'other')),
  category TEXT,
  subcategory TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  
  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  public_url TEXT,
  share_token UUID DEFAULT gen_random_uuid(),
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Source tracking (what generated this)
  source TEXT CHECK (source IN ('upload', 'generated', 'imported')),
  source_model TEXT,  -- e.g. 'gemini-3-pro'
  source_prompt TEXT,  -- generation prompt
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_campaign_id ON media_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_asset_type ON media_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);

-- RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media" ON media_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media" ON media_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media" ON media_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON media_assets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access media" ON media_assets FOR ALL USING (auth.role() = 'service_role');

-- Storage policies for media bucket
CREATE POLICY "Users access own media files" ON storage.objects
FOR ALL USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role media access" ON storage.objects
FOR ALL USING (
    bucket_id = 'media' AND
    auth.role() = 'service_role'
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_media_assets_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_assets_updated_at
    BEFORE UPDATE ON media_assets
    FOR EACH ROW EXECUTE FUNCTION update_media_assets_timestamp();
