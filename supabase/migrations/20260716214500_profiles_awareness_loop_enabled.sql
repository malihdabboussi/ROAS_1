-- Awareness loop toggle on profiles (CEO autopilot / mission-worker pattern evaluator).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS awareness_loop_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.awareness_loop_enabled IS
  'When true, CEO awareness / operational loop may fire for this user.';
