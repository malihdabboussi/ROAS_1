-- Add scheduled_at to missions and mission_subtasks for time-based scheduling.
-- scheduled_at gates when work begins (trigger time), distinct from due_date (deadline).

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

ALTER TABLE public.mission_subtasks
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mission_subtasks_scheduled
  ON public.mission_subtasks (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_missions_scheduled
  ON public.missions (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status IN ('inbox', 'planning', 'todo');
