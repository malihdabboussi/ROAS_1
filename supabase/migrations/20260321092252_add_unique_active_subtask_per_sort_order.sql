CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_subtasks_unique_active_sort
  ON public.mission_subtasks (mission_id, sort_order)
  WHERE status NOT IN ('cancelled', 'done');
