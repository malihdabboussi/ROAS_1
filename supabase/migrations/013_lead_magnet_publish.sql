-- Add slug and published_url columns to lead_magnets for public sharing
ALTER TABLE lead_magnets
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS published_url TEXT;

-- Index for fast public slug lookups (vibeyfunnels.com/lm/{slug})
CREATE INDEX IF NOT EXISTS lead_magnets_slug_idx ON lead_magnets (slug)
  WHERE slug IS NOT NULL;
