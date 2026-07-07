BEGIN;

CREATE OR REPLACE FUNCTION public.reconcile_stale_agent_traces()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reconciled_count INTEGER;
BEGIN
  UPDATE public.vb_agent_traces
  SET
    status = 'failed',
    error = COALESCE(NULLIF(error, ''), 'stale_streaming_trace_reconciled'),
    completed_at = COALESCE(completed_at, now()),
    duration_ms = COALESCE(
      duration_ms,
      LEAST(
        2147483647,
        GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(started_at, created_at))) * 1000)
        )
      )::INTEGER
    )
  WHERE status = 'streaming'
    AND created_at < now() - interval '2 hours';

  GET DIAGNOSTICS reconciled_count = ROW_COUNT;
  RETURN reconciled_count;
END;
$$;

SELECT public.reconcile_stale_agent_traces();

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron schema is not available after extension install';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'agent-traces-stale-reconcile';

  PERFORM cron.schedule(
    'agent-traces-stale-reconcile',
    '*/15 * * * *',
    'SELECT public.reconcile_stale_agent_traces();'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_overview(p_team_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
WITH team_agents AS (
  SELECT
    ar.id,
    ar.agent_key,
    ar.name,
    ar.role,
    ar.status,
    ar.image_url,
    ar.updated_at
  FROM public.agents_registry ar
  WHERE ar.team_id = p_team_id
),
keys AS (
  SELECT COALESCE(array_agg(agent_key), ARRAY[]::TEXT[]) AS agent_keys
  FROM team_agents
),
agent_status AS (
  SELECT status, count(*)::int AS n
  FROM team_agents
  GROUP BY status
),
mission_rollup AS (
  SELECT m.status, m.completed_at, m.updated_at
  FROM public.missions m
  WHERE m.assigned_agent_key IN (SELECT agent_key FROM team_agents)
     OR m.current_agent_key IN (SELECT agent_key FROM team_agents)
),
live_missions AS (
  SELECT
    'mission'::TEXT AS kind,
    m.id,
    m.title,
    m.status,
    m.current_agent_key,
    m.assigned_agent_key,
    COALESCE(m.updated_at, m.created_at) AS happened_at
  FROM public.missions m
  WHERE (
      m.assigned_agent_key IN (SELECT agent_key FROM team_agents)
      OR m.current_agent_key IN (SELECT agent_key FROM team_agents)
    )
    AND m.status IN ('planning', 'in_progress', 'review', 'blocked')
  ORDER BY COALESCE(m.updated_at, m.created_at) DESC
  LIMIT 50
),
live_tasks AS (
  SELECT
    'task'::TEXT AS kind,
    si.id,
    si.space_id,
    s.title AS space_title,
    si.title,
    si.task_execution_status AS status,
    COALESCE(
      activity.payload->>'agent_key',
      CASE WHEN si.assignee_type = 'agent' THEN si.assignee_id ELSE NULL END
    ) AS agent_key,
    COALESCE(si.updated_at, activity.created_at, si.created_at) AS happened_at
  FROM public.space_items si
  LEFT JOIN public.spaces s ON s.id = si.space_id
  LEFT JOIN LATERAL (
    SELECT sia.payload, sia.created_at
    FROM public.space_item_activity sia
    WHERE sia.item_id = si.id
      AND sia.event_type = 'agent_task_execution'
    ORDER BY sia.created_at DESC
    LIMIT 1
  ) activity ON true
  WHERE si.task_execution_status = 'running'
    AND COALESCE(
      activity.payload->>'agent_key',
      CASE WHEN si.assignee_type = 'agent' THEN si.assignee_id ELSE NULL END
    ) IN (SELECT agent_key FROM team_agents)
  ORDER BY COALESCE(si.updated_at, activity.created_at, si.created_at) DESC
  LIMIT 50
),
live_traces AS (
  SELECT
    'trace'::TEXT AS kind,
    t.id,
    t.conversation_id,
    COALESCE(c.title, 'Conversation') AS conversation_title,
    t.agent_key,
    t.channel,
    t.created_at AS happened_at
  FROM public.vb_agent_traces t
  LEFT JOIN public.conversations c ON c.id = t.conversation_id
  WHERE t.status = 'streaming'
    AND t.created_at >= now() - interval '2 hours'
    AND t.agent_key IN (SELECT agent_key FROM team_agents)
  ORDER BY t.created_at DESC
  LIMIT 50
),
live_delegations AS (
  SELECT
    'delegation'::TEXT AS kind,
    d.id,
    d.conversation_id,
    d.caller_agent_key,
    d.target_agent_key,
    d.status,
    d.type,
    left(d.prompt, 220) AS prompt_preview,
    COALESCE(d.completed_at, d.created_at) AS happened_at
  FROM public.agent_delegations d
  WHERE d.status IN ('pending', 'running')
    AND (
      d.caller_agent_key IN (SELECT agent_key FROM team_agents)
      OR d.target_agent_key IN (SELECT agent_key FROM team_agents)
    )
  ORDER BY COALESCE(d.completed_at, d.created_at) DESC
  LIMIT 50
),
recent_missions AS (
  SELECT
    'mission'::TEXT AS kind,
    m.id,
    m.title,
    m.status,
    m.current_agent_key,
    m.assigned_agent_key,
    COALESCE(m.completed_at, m.updated_at, m.created_at) AS happened_at
  FROM public.missions m
  WHERE (
      m.assigned_agent_key IN (SELECT agent_key FROM team_agents)
      OR m.current_agent_key IN (SELECT agent_key FROM team_agents)
    )
    AND m.status IN ('done', 'failed', 'error')
    AND COALESCE(m.completed_at, m.updated_at, m.created_at) >= now() - interval '7 days'
  ORDER BY COALESCE(m.completed_at, m.updated_at, m.created_at) DESC
  LIMIT 30
),
recent_channel AS (
  SELECT
    'channel'::TEXT AS kind,
    cm.id,
    cm.channel_id,
    ch.name AS channel_name,
    cm.sender_id AS agent_key,
    left(COALESCE(cm.content, ''), 220) AS preview,
    cm.created_at AS happened_at
  FROM public.channel_messages cm
  LEFT JOIN public.channels ch ON ch.id = cm.channel_id
  WHERE cm.sender_type = 'agent'
    AND cm.sender_id IN (SELECT agent_key FROM team_agents)
    AND cm.created_at >= now() - interval '7 days'
  ORDER BY cm.created_at DESC
  LIMIT 30
),
recent_automations AS (
  SELECT
    'automation'::TEXT AS kind,
    r.id,
    r.space_id,
    s.title AS space_title,
    r.automation_id,
    r.status,
    r.linked_mission_id,
    r.created_at AS happened_at
  FROM public.space_automation_runs r
  LEFT JOIN public.spaces s ON s.id = r.space_id
  WHERE r.created_at >= now() - interval '7 days'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(r.actions_executed) a(action_row)
      WHERE action_row->>'agent_key' IN (SELECT agent_key FROM team_agents)
         OR action_row->'action'->>'agent_key' IN (SELECT agent_key FROM team_agents)
    )
  ORDER BY r.created_at DESC
  LIMIT 30
)
SELECT jsonb_build_object(
  'team_id', p_team_id,
  'generated_at', now(),
  'agents', (SELECT COALESCE(jsonb_agg(to_jsonb(ta) ORDER BY ta.name), '[]'::jsonb) FROM team_agents ta),
  'kpis', jsonb_build_object(
    'agents_by_status', (SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb) FROM agent_status),
    'missions', (
      SELECT jsonb_build_object(
        'active', count(*) FILTER (WHERE status IN ('planning', 'in_progress', 'review')),
        'blocked', count(*) FILTER (WHERE status = 'blocked'),
        'todo', count(*) FILTER (WHERE status IN ('todo', 'inbox')),
        'completed', count(*) FILTER (WHERE status = 'done'),
        'failed', count(*) FILTER (WHERE status IN ('failed', 'error')),
        'done_7d', count(*) FILTER (
          WHERE status = 'done' AND completed_at >= now() - interval '7 days'
        )
      )
      FROM mission_rollup
    )
  ),
  'live', jsonb_build_object(
    'missions', (SELECT COALESCE(jsonb_agg(to_jsonb(lm) ORDER BY lm.happened_at DESC), '[]'::jsonb) FROM live_missions lm),
    'tasks', (SELECT COALESCE(jsonb_agg(to_jsonb(lt) ORDER BY lt.happened_at DESC), '[]'::jsonb) FROM live_tasks lt),
    'traces', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.happened_at DESC), '[]'::jsonb) FROM live_traces t),
    'delegations', (SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.happened_at DESC), '[]'::jsonb) FROM live_delegations d)
  ),
  'recent', jsonb_build_object(
    'missions', (SELECT COALESCE(jsonb_agg(to_jsonb(rm) ORDER BY rm.happened_at DESC), '[]'::jsonb) FROM recent_missions rm),
    'channel', (SELECT COALESCE(jsonb_agg(to_jsonb(rc) ORDER BY rc.happened_at DESC), '[]'::jsonb) FROM recent_channel rc),
    'automations', (SELECT COALESCE(jsonb_agg(to_jsonb(ra) ORDER BY ra.happened_at DESC), '[]'::jsonb) FROM recent_automations ra)
  )
);
$$;

REVOKE ALL ON FUNCTION public.get_team_overview(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_team_overview(UUID) TO authenticated;

COMMIT;
