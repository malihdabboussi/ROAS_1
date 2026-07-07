-- Add per-placement TSX support: allows different TSX creative per placement (feed, story, reels)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS placement_tsx jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ads.placement_tsx IS 'Per-placement TSX overrides keyed by placement name (feed, story, reels). Falls back to generated_tsx when empty.';
