BEGIN;

-- 1) Add parent_item_id for flat (1-level) subtask support.
ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES public.space_items(id) ON DELETE CASCADE;

-- 2) Partial index for fast child lookups.
CREATE INDEX IF NOT EXISTS idx_space_items_parent_item
  ON public.space_items(parent_item_id)
  WHERE parent_item_id IS NOT NULL;

-- 3) Recreate your_turn_items view with parent_item_id column.
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
  ('/mission-control?mission=' || ms.mission_id::text) AS source_url,
  left(COALESCE(ms.feedback, ''), 280) AS preview,
  ms.created_at,
  ms.updated_at
FROM public.mission_subtasks ms
WHERE ms.assignee_type = 'human'
  AND ms.status IN ('awaiting_human','pending','revision')
  AND ms.assigned_user_id = auth.uid()

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
  AND si.status <> 'done'

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

COMMENT ON VIEW public.your_turn_items IS 'Unified inbox: mission human subtasks + space items assigned to me + pending agent suggestions + plan approvals awaiting my decision. security_invoker + auth.uid() filter.';
GRANT SELECT ON public.your_turn_items TO authenticated;

COMMIT;
