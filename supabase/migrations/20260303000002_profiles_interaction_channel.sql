ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'studio',
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
