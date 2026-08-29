-- Product telemetry for the canonical assigned-task recommendation lifecycle.
-- Events never change task status. The quality view derives edited, completed,
-- and stale state from the current canonical space_items row.

CREATE TABLE IF NOT EXISTS public.action_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_key TEXT GENERATED ALWAYS AS (COALESCE(org_id::text, 'personal')) STORED,
  task_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('surfaced', 'accepted', 'snoozed', 'dismissed', 'false_positive')
  ),
  source_kind TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_recommendation_events_user_scope_created
  ON public.action_recommendation_events(user_id, scope_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_recommendation_events_task
  ON public.action_recommendation_events(task_id, event_type, created_at DESC);

ALTER TABLE public.action_recommendation_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.action_recommendation_events TO authenticated;

DROP POLICY IF EXISTS owner_action_recommendation_events_all
  ON public.action_recommendation_events;
CREATE POLICY owner_action_recommendation_events_all
  ON public.action_recommendation_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE VIEW public.action_recommendation_quality
WITH (security_invoker = true)
AS
SELECT
  events.user_id,
  events.org_id,
  events.scope_key,
  events.task_id,
  count(*) FILTER (WHERE events.event_type = 'surfaced') AS surfaced_count,
  count(*) FILTER (WHERE events.event_type = 'accepted') AS accepted_count,
  count(*) FILTER (WHERE events.event_type = 'snoozed') AS snoozed_count,
  count(*) FILTER (WHERE events.event_type = 'dismissed') AS dismissed_count,
  count(*) FILTER (WHERE events.event_type = 'false_positive') AS false_positive_count,
  min(events.created_at) FILTER (WHERE events.event_type = 'surfaced') AS first_surfaced_at,
  max(events.created_at) FILTER (WHERE events.event_type = 'surfaced') AS last_surfaced_at,
  max(events.created_at) FILTER (WHERE events.event_type = 'accepted') AS accepted_at,
  max(events.created_at) FILTER (WHERE events.event_type = 'false_positive') AS false_positive_at,
  bool_or(
    items.updated_at IS NOT NULL
    AND items.updated_at > events.created_at
    AND events.event_type = 'surfaced'
  ) AS edited_after_surface,
  (
    lower(COALESCE(items.status, '')) IN ('done', 'complete', 'completed', 'resolved', 'archived')
    OR items.custom_data->'action_lifecycle'->>'review_state' = 'resolved'
    OR items.custom_data ? 'completion_origin'
  )
    AS completed,
  (
    (items.due_date IS NOT NULL AND items.due_date < now())
    OR items.custom_data->'action_lifecycle'->>'review_state' = 'needs_review'
  ) AS stale,
  items.status AS current_status,
  items.updated_at AS task_updated_at
FROM public.action_recommendation_events AS events
JOIN public.space_items AS items ON items.id = events.task_id
GROUP BY
  events.user_id,
  events.org_id,
  events.scope_key,
  events.task_id,
  items.status,
  items.updated_at,
  items.due_date,
  items.custom_data;

GRANT SELECT ON public.action_recommendation_quality TO authenticated;
