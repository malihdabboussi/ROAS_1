ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS outline JSONB,
  ADD COLUMN IF NOT EXISTS text_layer TEXT,
  ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS index_error TEXT,
  ADD COLUMN IF NOT EXISTS source_surface TEXT CHECK (
    source_surface IN ('chat', 'team_chat', 'mission', 'brain', 'generated')
  );
