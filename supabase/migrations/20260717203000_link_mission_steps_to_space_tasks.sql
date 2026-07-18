BEGIN;

ALTER TABLE public.mission_subtasks
  ADD COLUMN IF NOT EXISTS publish_to_task_list BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS linked_mission_subtask_id UUID
    REFERENCES public.mission_subtasks(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_items_linked_mission_subtask
  ON public.space_items(linked_mission_subtask_id)
  WHERE linked_mission_subtask_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mission_subtask_space_task_status(subtask_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE subtask_status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'awaiting_human' THEN 'todo'
    WHEN 'revision' THEN 'in_review'
    WHEN 'blocked' THEN 'in_review'
    WHEN 'done' THEN 'done'
    WHEN 'cancelled' THEN 'done'
    ELSE 'todo'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_mission_subtask_to_space_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_row public.missions%ROWTYPE;
  space_org_id UUID;
  mapped_assignee_type TEXT;
  mapped_assignee_id TEXT;
BEGIN
  IF NEW.publish_to_task_list IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT * INTO mission_row
  FROM public.missions
  WHERE id = NEW.mission_id;

  IF mission_row.space_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT org_id INTO space_org_id
  FROM public.spaces
  WHERE id = mission_row.space_id;

  IF space_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  mapped_assignee_type := CASE
    WHEN NEW.assignee_type IN ('human', 'agent') THEN NEW.assignee_type
    ELSE 'unassigned'
  END;
  mapped_assignee_id := CASE
    WHEN NEW.assignee_type = 'human' THEN NEW.assigned_user_id::text
    WHEN NEW.assignee_type = 'agent' THEN NEW.assigned_agent_key
    ELSE NULL
  END;

  INSERT INTO public.space_items (
    space_id,
    org_id,
    user_id,
    title,
    status,
    priority,
    assignee_type,
    assignee_id,
    due_date,
    description,
    notes,
    source,
    linked_mission_id,
    linked_mission_subtask_id,
    sort_order
  )
  VALUES (
    mission_row.space_id,
    space_org_id,
    mission_row.user_id,
    NEW.title,
    public.mission_subtask_space_task_status(NEW.status),
    COALESCE(mission_row.priority, 'medium'),
    mapped_assignee_type,
    mapped_assignee_id,
    NEW.scheduled_at,
    NEW.intent->>'endState',
    NEW.intent->>'ecology',
    'agent',
    NEW.mission_id,
    NEW.id,
    NEW.sort_order
  )
  ON CONFLICT (linked_mission_subtask_id) WHERE linked_mission_subtask_id IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    assignee_type = EXCLUDED.assignee_type,
    assignee_id = EXCLUDED.assignee_id,
    due_date = EXCLUDED.due_date,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mission_subtask_to_space_task ON public.mission_subtasks;
CREATE TRIGGER trg_sync_mission_subtask_to_space_task
  AFTER INSERT OR UPDATE OF
    publish_to_task_list,
    title,
    status,
    assignee_type,
    assigned_agent_key,
    assigned_user_id,
    scheduled_at,
    intent,
    sort_order
  ON public.mission_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mission_subtask_to_space_task();

DROP VIEW IF EXISTS public.your_turn_items;

CREATE VIEW public.your_turn_items
WITH (security_invoker = true)
AS
SELECT
  'mission_subtask'::text AS kind,
  ms.id,
  ms.title,
  ms.status,
  ms.assigned_user_id AS assignee_user_id,
  ms.org_id,
  ms.mission_id,
  NULL::uuid AS space_id,
  NULL::text AS suggestion_state,
  NULL::uuid AS parent_item_id,
  ms.scheduled_at AS due_at,
  ('/mission-control?mission=' || ms.mission_id::text || '&subtask=' || ms.id::text) AS source_url,
  left(COALESCE(ms.feedback, ''), 280) AS preview,
  ms.created_at,
  ms.updated_at
FROM public.mission_subtasks ms
WHERE ms.assignee_type = 'human'
  AND ms.status IN ('awaiting_human','pending','revision')
  AND ms.assigned_user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1
    FROM public.space_items linked_item
    WHERE linked_item.linked_mission_subtask_id = ms.id
  )

UNION ALL

SELECT
  'space_item'::text AS kind,
  si.id,
  si.title,
  si.status,
  si.assignee_id::uuid AS assignee_user_id,
  si.org_id,
  si.linked_mission_id AS mission_id,
  si.space_id,
  si.suggestion_state,
  si.parent_item_id,
  si.due_date AS due_at,
  ('/spaces?space=' || si.space_id::text || '&item=' || si.id::text) AS source_url,
  left(COALESCE(si.notes, ''), 280) AS preview,
  si.created_at,
  si.updated_at
FROM public.space_items si
WHERE si.assignee_type = 'human'
  AND si.assignee_id IS NOT NULL
  AND si.assignee_id::uuid = auth.uid()
  AND (si.suggestion_state IS NULL OR si.suggestion_state <> 'dismissed')
  AND si.status NOT IN ('done', 'archived')

UNION ALL

SELECT
  'suggestion'::text AS kind,
  si.id,
  si.title,
  si.status,
  si.user_id AS assignee_user_id,
  si.org_id,
  si.linked_mission_id AS mission_id,
  si.space_id,
  si.suggestion_state,
  si.parent_item_id,
  si.due_date AS due_at,
  ('/spaces?space=' || si.space_id::text || '&item=' || si.id::text) AS source_url,
  left(COALESCE(si.notes, ''), 280) AS preview,
  si.created_at,
  si.updated_at
FROM public.space_items si
WHERE si.source = 'agent_suggested'
  AND si.suggestion_state = 'pending'
  AND si.user_id = auth.uid()

UNION ALL

SELECT
  'plan_approval'::text AS kind,
  m.id,
  m.title,
  m.status,
  m.user_id AS assignee_user_id,
  m.org_id,
  m.id AS mission_id,
  NULL::uuid AS space_id,
  NULL::text AS suggestion_state,
  NULL::uuid AS parent_item_id,
  m.due_date AS due_at,
  ('/mission-control?mission=' || m.id::text || '&tab=plan') AS source_url,
  left(COALESCE(m.brief, m.description, ''), 280) AS preview,
  m.created_at,
  m.updated_at
FROM public.missions m
WHERE m.status = 'pending_approval'
  AND m.user_id = auth.uid();

COMMENT ON VIEW public.your_turn_items IS
  'Unified inbox for human mission work, linked Space Tasks, suggestions, and plan approvals. Published mission steps appear once through their linked Space Task.';

GRANT SELECT ON public.your_turn_items TO authenticated;

COMMIT;
