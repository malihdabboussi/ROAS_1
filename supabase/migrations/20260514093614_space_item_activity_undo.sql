BEGIN;

ALTER TABLE public.space_item_activity
  ADD COLUMN IF NOT EXISTS actor_kind TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS agent_message_id UUID,
  ADD COLUMN IF NOT EXISTS tool_call_id TEXT,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverted_by_activity_id UUID REFERENCES public.space_item_activity(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot JSONB;

ALTER TABLE public.space_item_activity
  DROP CONSTRAINT IF EXISTS space_item_activity_actor_kind_check;

ALTER TABLE public.space_item_activity
  ADD CONSTRAINT space_item_activity_actor_kind_check
  CHECK (actor_kind IN ('user', 'agent', 'automation', 'system'));

ALTER TABLE public.space_item_activity
  DROP CONSTRAINT IF EXISTS space_item_activity_event_type_check;

ALTER TABLE public.space_item_activity
  ADD CONSTRAINT space_item_activity_event_type_check CHECK (
    event_type IN (
      'comment',
      'field_change',
      'status_change',
      'assignee_change',
      'created',
      'deleted',
      'deleted_subtask',
      'added_subtask',
      'agent_task_execution',
      'automation_comment',
      'automation_action',
      'external_email_received',
      'external_slack_message_received',
      'external_fathom_recording_ready'
    )
    OR event_type LIKE 'artifact\_%' ESCAPE '\'
    OR event_type LIKE 'contact\_%' ESCAPE '\'
  );

CREATE INDEX IF NOT EXISTS idx_space_item_activity_agent_message
  ON public.space_item_activity(agent_message_id, created_at DESC)
  WHERE agent_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_space_item_activity_tool_call
  ON public.space_item_activity(tool_call_id)
  WHERE tool_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_space_item_activity_unreverted_agent
  ON public.space_item_activity(space_id, actor_kind, reverted_at, created_at DESC)
  WHERE actor_kind = 'agent';

DROP POLICY IF EXISTS "Users can update own activity" ON public.space_item_activity;
CREATE POLICY "Users can update own activity"
  ON public.space_item_activity FOR UPDATE TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;
