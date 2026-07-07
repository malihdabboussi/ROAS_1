ALTER TABLE public.space_items
  DROP CONSTRAINT IF EXISTS space_items_task_execution_status_check;

ALTER TABLE public.space_items
  ADD CONSTRAINT space_items_task_execution_status_check
  CHECK (
    task_execution_status IS NULL
    OR task_execution_status IN ('running', 'done', 'failed', 'cancelled')
  );
