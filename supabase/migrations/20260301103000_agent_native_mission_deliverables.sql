ALTER TABLE public.mission_deliverables
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS source_action TEXT,
  ADD COLUMN IF NOT EXISTS generation_status TEXT,
  ADD COLUMN IF NOT EXISTS generation_job_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_mission_deliverables_source_action
  ON public.mission_deliverables (source_action);

CREATE INDEX IF NOT EXISTS idx_mission_deliverables_generation_job_id
  ON public.mission_deliverables (generation_job_id)
  WHERE generation_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mission_deliverables_type_created
  ON public.mission_deliverables (mission_id, type, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mission_deliverables_generation_status_check'
  ) THEN
    ALTER TABLE public.mission_deliverables
      ADD CONSTRAINT mission_deliverables_generation_status_check
      CHECK (
        generation_status IS NULL
        OR generation_status IN ('starting', 'processing', 'succeeded', 'failed', 'canceled')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_mission_deliverables_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mission_deliverables_updated_at ON public.mission_deliverables;
CREATE TRIGGER trg_mission_deliverables_updated_at
BEFORE UPDATE ON public.mission_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.set_mission_deliverables_updated_at();
