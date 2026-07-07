ALTER TABLE public.list_items
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurrence JSONB,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.list_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_list_items_recurrence_active
  ON public.list_items ((recurrence->>'trigger'))
  WHERE recurrence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_list_items_recurrence_parent
  ON public.list_items (recurrence_parent_id)
  WHERE recurrence_parent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.try_acquire_list_items_recurrence_lock()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_try_advisory_lock(hashtext('list_items_recurrence'));
$$;

CREATE OR REPLACE FUNCTION public.release_list_items_recurrence_lock()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_advisory_unlock(hashtext('list_items_recurrence'));
$$;
