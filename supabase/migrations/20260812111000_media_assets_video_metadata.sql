-- Video assets previously stored no duration and no poster frame, so galleries
-- had to mount <video preload="metadata"> elements as thumbnails and Global
-- Artifacts showed no thumbnail at all for videos.
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS poster_url TEXT;
