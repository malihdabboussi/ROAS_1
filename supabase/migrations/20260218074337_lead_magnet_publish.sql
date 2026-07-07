ALTER TABLE lead_magnets
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS published_url TEXT;

CREATE INDEX IF NOT EXISTS lead_magnets_slug_idx ON lead_magnets (slug)
  WHERE slug IS NOT NULL;;
