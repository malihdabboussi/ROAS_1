ALTER TABLE mission_deliverables
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IN ('mission', 'chat'))
    DEFAULT 'mission';
