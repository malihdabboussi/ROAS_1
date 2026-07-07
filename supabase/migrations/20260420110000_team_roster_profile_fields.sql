-- Team roster profile fields: extend `profiles` with data the planner needs to assign
-- subtasks to humans: functional role, specialties, consent flag, delegation notes,
-- timezone, working hours, OOO. All nullable / defaulted so existing rows are unaffected.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS functional_role TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS accepts_agent_assignments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delegation_notes TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS working_hours JSONB,
  ADD COLUMN IF NOT EXISTS out_of_office_until TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.functional_role IS 'Human-facing role label ("Lead Designer", "Founder & CEO") read by the planner to ground human subtask assignments.';
COMMENT ON COLUMN public.profiles.specialties IS 'Tags the planner uses to match subtasks to humans (e.g. ["visual_design","copywriting"]).';
COMMENT ON COLUMN public.profiles.accepts_agent_assignments IS 'Hard gate: if false, the manager agent must not assign subtasks to this user.';
COMMENT ON COLUMN public.profiles.delegation_notes IS 'Free-text user preference for what they want or do not want delegated to them.';
COMMENT ON COLUMN public.profiles.working_hours IS 'Optional JSONB like {"mon":{"start":"09:00","end":"18:00"},...} used for soft availability checks.';
COMMENT ON COLUMN public.profiles.out_of_office_until IS 'Soft signal: planner warns but does not block when user is OOO.';
