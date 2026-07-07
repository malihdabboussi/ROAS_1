-- Add priority_rank to mission_outbox for priority-aware dispatch ordering.
-- Mapping: urgent=1, high=2, medium=3, low=4. Default 3 (medium).

ALTER TABLE public.mission_outbox
  ADD COLUMN IF NOT EXISTS priority_rank SMALLINT NOT NULL DEFAULT 3;

-- Replace the old dispatch scan index with a composite that includes priority_rank.
-- The dispatcher query: WHERE status='pending' AND next_attempt_at <= NOW()
--   ORDER BY priority_rank ASC, created_at ASC
DROP INDEX IF EXISTS idx_mission_outbox_dispatch_scan;
CREATE INDEX idx_mission_outbox_dispatch_scan
  ON public.mission_outbox (status, next_attempt_at, priority_rank, created_at);
