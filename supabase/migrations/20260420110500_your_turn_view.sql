-- your_turn_items: unified inbox view merging four sources into one card shape.
-- Everything the current human owes: mission human subtasks, list items assigned to
-- them, agent-suggested list items awaiting decision, missions pending plan approval.

CREATE OR REPLACE VIEW public.your_turn_items
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
  NULL::uuid AS list_id,
  NULL::text AS suggestion_state,
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
  'list_item'::text AS kind,
  li.id,
  li.title,
  li.status,
  li.assignee_id::uuid AS assignee_user_id,
  li.org_id,
  li.linked_mission_id AS mission_id,
  li.list_id,
  li.suggestion_state,
  li.due_date AS due_at,
  ('/lists?list=' || li.list_id::text || '&item=' || li.id::text) AS source_url,
  left(COALESCE(li.notes, ''), 280) AS preview,
  li.created_at,
  li.updated_at
FROM public.list_items li
WHERE li.assignee_type = 'human'
  AND li.assignee_id IS NOT NULL
  AND li.assignee_id::uuid = auth.uid()
  AND (li.suggestion_state IS NULL OR li.suggestion_state <> 'dismissed')
  AND li.status <> 'done'

UNION ALL

SELECT
  'suggestion'::text AS kind,
  li.id,
  li.title,
  li.status,
  li.user_id AS assignee_user_id,
  li.org_id,
  li.linked_mission_id AS mission_id,
  li.list_id,
  li.suggestion_state,
  li.due_date AS due_at,
  ('/lists?list=' || li.list_id::text || '&item=' || li.id::text) AS source_url,
  left(COALESCE(li.notes, ''), 280) AS preview,
  li.created_at,
  li.updated_at
FROM public.list_items li
WHERE li.source = 'agent_suggested'
  AND li.suggestion_state = 'pending'
  AND li.user_id = auth.uid()

UNION ALL

SELECT
  'plan_approval'::text AS kind,
  m.id,
  m.title,
  m.status,
  m.user_id AS assignee_user_id,
  m.org_id,
  m.id AS mission_id,
  NULL::uuid AS list_id,
  NULL::text AS suggestion_state,
  m.due_date AS due_at,
  ('/mission-control?mission=' || m.id::text || '&tab=plan') AS source_url,
  left(COALESCE(m.brief, m.description, ''), 280) AS preview,
  m.created_at,
  m.updated_at
FROM public.missions m
WHERE m.status = 'pending_approval'
  AND m.user_id = auth.uid();

COMMENT ON VIEW public.your_turn_items IS 'Unified inbox: mission human subtasks + list items assigned to me + pending agent suggestions + plan approvals awaiting my decision. security_invoker + auth.uid() filter.';

GRANT SELECT ON public.your_turn_items TO authenticated;
