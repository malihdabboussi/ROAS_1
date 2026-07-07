ALTER TABLE public.mission_subtasks
  ADD COLUMN IF NOT EXISTS output_contract jsonb,
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS contract_verification jsonb,
  ADD COLUMN IF NOT EXISTS preflight_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correction_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mission_subtasks_contract_status
  ON public.mission_subtasks (contract_status)
  WHERE contract_status IS NOT NULL;
