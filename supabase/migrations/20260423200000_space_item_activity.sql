BEGIN;

-- 1) Create space_item_activity table for human comments, field changes, file attachments.
CREATE TABLE IF NOT EXISTS public.space_item_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'comment',
    'field_change',
    'status_change',
    'assignee_change',
    'created',
    'deleted_subtask',
    'added_subtask'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Indexes for common queries.
CREATE INDEX IF NOT EXISTS idx_space_item_activity_item
  ON public.space_item_activity(item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_space_item_activity_space
  ON public.space_item_activity(space_id);

-- 3) RLS policies (mirrors space_items pattern).
ALTER TABLE public.space_item_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON public.space_item_activity FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team activity"
  ON public.space_item_activity FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND is_org_member(org_id)
  );

CREATE POLICY "Users can insert own activity"
  ON public.space_item_activity FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

-- 4) Realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_item_activity;

COMMIT;
