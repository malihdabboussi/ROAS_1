ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS description text;
