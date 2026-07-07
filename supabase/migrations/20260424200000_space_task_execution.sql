BEGIN;

-- 1) Widen space_item_activity event_type CHECK to support task execution and automation comments.
ALTER TABLE public.space_item_activity
  DROP CONSTRAINT IF EXISTS space_item_activity_event_type_check;

ALTER TABLE public.space_item_activity
  ADD CONSTRAINT space_item_activity_event_type_check CHECK (event_type IN (
    'comment',
    'field_change',
    'status_change',
    'assignee_change',
    'created',
    'deleted_subtask',
    'added_subtask',
    'agent_task_execution',
    'automation_comment'
  ));

-- Service-role inserts for agent task execution (user_id is the task owner, not auth.uid).
CREATE POLICY "Service can insert agent task activity"
  ON public.space_item_activity FOR INSERT TO service_role
  WITH CHECK (true);

-- Service-role updates for progressive payload writes during streaming.
CREATE POLICY "Service can update agent task activity"
  ON public.space_item_activity FOR UPDATE TO service_role
  USING (true);

-- 2) Add task_execution_status to space_items.
ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS task_execution_status TEXT
  CHECK (task_execution_status IS NULL OR task_execution_status IN ('running', 'done', 'failed'));

-- 3) Create space_item_deliverables table.
CREATE TABLE IF NOT EXISTS public.space_item_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  agent_key TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('doc', 'text', 'image', 'video', 'pdf', 'file')),
  title TEXT,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  mime_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_space_item_deliverables_item ON public.space_item_deliverables(item_id);
CREATE INDEX idx_space_item_deliverables_space ON public.space_item_deliverables(space_id);

ALTER TABLE public.space_item_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deliverables"
  ON public.space_item_deliverables FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team deliverables"
  ON public.space_item_deliverables FOR SELECT TO public
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Service can insert deliverables"
  ON public.space_item_deliverables FOR INSERT TO service_role
  WITH CHECK (true);

-- 4) Create space_automation_run_state table for paused automation runs.
CREATE TABLE IF NOT EXISTS public.space_automation_run_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  trigger_event JSONB NOT NULL,
  actions_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_action_index INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('paused', 'resumed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_space_automation_run_state_item_status
  ON public.space_automation_run_state(item_id, status);

ALTER TABLE public.space_automation_run_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage run state"
  ON public.space_automation_run_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own run state"
  ON public.space_automation_run_state FOR SELECT TO public
  USING (auth.uid() = user_id);

COMMIT;
