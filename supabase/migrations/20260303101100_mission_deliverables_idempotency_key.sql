ALTER TABLE public.mission_deliverables
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_deliverables_idempotency_key_unique
  ON public.mission_deliverables (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.mission_deliverables.idempotency_key IS
  'Deterministic key to collapse duplicate artifact writes across retries.';
