ALTER TABLE workspace_pages
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
