-- Keep corrective runs and worker retries on the funnel already owned by a mission subtask.
ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS funnels_mission_subtask_create_unique
ON public.funnels (
  (metadata ->> 'mission_id'),
  (metadata ->> 'mission_subtask_id')
)
WHERE metadata ->> 'source_action' = 'create_funnel'
  AND metadata ? 'mission_id'
  AND metadata ? 'mission_subtask_id';
