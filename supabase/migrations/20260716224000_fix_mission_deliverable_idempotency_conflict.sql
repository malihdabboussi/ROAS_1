-- PostgREST emits ON CONFLICT (idempotency_key) for mission deliverable upserts.
-- A partial unique index cannot be inferred without the same predicate, while
-- PostgreSQL already permits multiple NULL values in a regular unique index.
DROP INDEX IF EXISTS public.idx_mission_deliverables_idempotency_key_unique;

CREATE UNIQUE INDEX idx_mission_deliverables_idempotency_key_unique
  ON public.mission_deliverables (idempotency_key);
