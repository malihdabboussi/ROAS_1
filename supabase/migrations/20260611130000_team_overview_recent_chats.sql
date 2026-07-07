BEGIN;

CREATE OR REPLACE FUNCTION public.get_team_overview(
  p_team_id UUID,
  p_start TIMESTAMPTZ DEFAULT (now() - interval '7 days'),
  p_end   TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
WITH bounds AS (
  SELECT
    p_start AS start_at,
    p_end   AS end_at,
    GREATEST(p_end - p_start, interval '1 minute') AS window_size,
    p_start - GREATEST(p_end - p_start, interval '1 minute') AS prev_start,
    p_start AS prev_end
),
team_agents AS (
  SELECT ar.id, ar.agent_key, ar.name, ar.role, ar.status, ar.image_url, ar.updated_at
  FROM public.agents_registry ar
  WHERE ar.team_id = p_team_id
),
agent_status AS (
  SELECT status, count(*)::int AS n
  FROM team_agents
  GROUP BY status
),
mission_rollup AS (
  SELECT m.id, m.status, m.created_at, m.completed_at, m.updated_at,
         COALESCE(m.current_agent_key, m.assigned_agent_key) AS agent_key,
         m.campaign_id
  FROM public.missions m
  WHERE m.assigned_agent_key IN (SELECT agent_key FROM team_agents)
     OR m.current_agent_key IN (SELECT agent_key FROM team_agents)
),
window_missions AS (
  SELECT mr.*
  FROM mission_rollup mr
  WHERE mr.completed_at IS NOT NULL
    AND mr.completed_at >= (SELECT start_at FROM bounds)
    AND mr.completed_at <  (SELECT end_at FROM bounds)
),
prev_window_missions AS (
  SELECT mr.*
  FROM mission_rollup mr
  WHERE mr.completed_at IS NOT NULL
    AND mr.completed_at >= (SELECT prev_start FROM bounds)
    AND mr.completed_at <  (SELECT prev_end FROM bounds)
),
window_channel AS (
  SELECT cm.id, cm.channel_id, cm.sender_id AS agent_key, cm.created_at
  FROM public.channel_messages cm
  WHERE cm.sender_type = 'agent'
    AND cm.sender_id IN (SELECT agent_key FROM team_agents)
    AND cm.created_at >= (SELECT start_at FROM bounds)
    AND cm.created_at <  (SELECT end_at FROM bounds)
),
window_chats AS (
  SELECT t.id, t.agent_key, t.created_at
  FROM public.vb_agent_traces t
  WHERE t.agent_key IN (SELECT agent_key FROM team_agents)
    AND t.status IN ('completed', 'failed')
    AND t.created_at >= (SELECT start_at FROM bounds)
    AND t.created_at <  (SELECT end_at FROM bounds)
),
window_automations AS (
  SELECT r.id, r.created_at, r.status, r.space_id
  FROM public.space_automation_runs r
  WHERE r.created_at >= (SELECT start_at FROM bounds)
    AND r.created_at <  (SELECT end_at FROM bounds)
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(r.actions_executed) a(action_row)
      WHERE action_row->>'agent_key' IN (SELECT agent_key FROM team_agents)
         OR action_row->'action'->>'agent_key' IN (SELECT agent_key FROM team_agents)
    )
),
days AS (
  SELECT generate_series(
    date_trunc('day', (SELECT start_at FROM bounds)),
    date_trunc('day', (SELECT end_at FROM bounds) - interval '1 millisecond'),
    interval '1 day'
  )::date AS day
),
series_missions AS (
  SELECT d.day, count(wm.id)::int AS n
  FROM days d
  LEFT JOIN window_missions wm
    ON date_trunc('day', wm.completed_at)::date = d.day
    AND wm.status = 'done'
  GROUP BY d.day
),
series_failures AS (
  SELECT d.day, count(wm.id)::int AS n
  FROM days d
  LEFT JOIN window_missions wm
    ON date_trunc('day', wm.completed_at)::date = d.day
    AND wm.status IN ('failed', 'error')
  GROUP BY d.day
),
series_channel AS (
  SELECT d.day, count(wc.id)::int AS n
  FROM days d
  LEFT JOIN window_channel wc
    ON date_trunc('day', wc.created_at)::date = d.day
  GROUP BY d.day
),
series_chats AS (
  SELECT d.day, count(wch.id)::int AS n
  FROM days d
  LEFT JOIN window_chats wch
    ON date_trunc('day', wch.created_at)::date = d.day
  GROUP BY d.day
),
series_automations AS (
  SELECT d.day, count(wa.id)::int AS n
  FROM days d
  LEFT JOIN window_automations wa
    ON date_trunc('day', wa.created_at)::date = d.day
  GROUP BY d.day
),
per_agent_window AS (
  SELECT
    ta.agent_key,
    count(*) FILTER (WHERE wm.status = 'done')::int AS completed,
    count(*) FILTER (WHERE wm.status IN ('failed','error'))::int AS failed
  FROM team_agents ta
  LEFT JOIN window_missions wm ON wm.agent_key = ta.agent_key
  GROUP BY ta.agent_key
),
per_agent_live AS (
  SELECT
    ta.agent_key,
    count(*) FILTER (
      WHERE m.status IN ('planning','in_progress','review','blocked')
    )::int AS live_active,
    count(*) FILTER (WHERE m.status = 'blocked')::int AS live_blocked
  FROM team_agents ta
  LEFT JOIN public.missions m
    ON m.current_agent_key = ta.agent_key OR m.assigned_agent_key = ta.agent_key
  GROUP BY ta.agent_key
),
coverage_campaign AS (
  SELECT c.id, COALESCE(c.name, 'Untitled') AS name, count(wm.id)::int AS completed
  FROM window_missions wm
  JOIN public.campaigns c ON c.id = wm.campaign_id
  WHERE wm.status = 'done' AND wm.campaign_id IS NOT NULL
  GROUP BY c.id, c.name
  ORDER BY completed DESC
  LIMIT 8
),
coverage_channel AS (
  SELECT ch.id, COALESCE(ch.name, 'channel') AS name, count(wc.id)::int AS posts
  FROM window_channel wc
  JOIN public.channels ch ON ch.id = wc.channel_id
  GROUP BY ch.id, ch.name
  ORDER BY posts DESC
  LIMIT 8
),
live_missions AS (
  SELECT
    'mission'::TEXT AS kind,
    m.id, m.title, m.status,
    m.current_agent_key, m.assigned_agent_key,
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
    si.id, si.space_id, s.title AS space_title, si.title,
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
    WHERE sia.item_id = si.id AND sia.event_type = 'agent_task_execution'
    ORDER BY sia.created_at DESC LIMIT 1
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
    t.id, t.conversation_id,
    COALESCE(c.title, 'Conversation') AS conversation_title,
    t.agent_key, t.channel,
    t.created_at AS happened_at
  FROM public.vb_agent_traces t
  LEFT JOIN public.conversations c ON c.id = t.conversation_id
  WHERE t.status = 'streaming'
    AND t.agent_key IN (SELECT agent_key FROM team_agents)
  ORDER BY t.created_at DESC
  LIMIT 50
),
live_delegations AS (
  SELECT
    'delegation'::TEXT AS kind,
    d.id, d.conversation_id,
    d.caller_agent_key, d.target_agent_key,
    d.status, d.type,
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
    m.id, m.title, m.status,
    m.current_agent_key, m.assigned_agent_key,
    COALESCE(m.completed_at, m.updated_at, m.created_at) AS happened_at
  FROM public.missions m
  WHERE (
      m.assigned_agent_key IN (SELECT agent_key FROM team_agents)
      OR m.current_agent_key IN (SELECT agent_key FROM team_agents)
    )
    AND m.status IN ('done', 'failed', 'error')
    AND COALESCE(m.completed_at, m.updated_at, m.created_at) >= (SELECT start_at FROM bounds)
    AND COALESCE(m.completed_at, m.updated_at, m.created_at) <  (SELECT end_at FROM bounds)
  ORDER BY COALESCE(m.completed_at, m.updated_at, m.created_at) DESC
  LIMIT 50
),
recent_channel AS (
  SELECT
    'channel'::TEXT AS kind,
    cm.id, cm.channel_id, ch.name AS channel_name,
    cm.sender_id AS agent_key,
    left(COALESCE(cm.content, ''), 220) AS preview,
    cm.created_at AS happened_at
  FROM public.channel_messages cm
  LEFT JOIN public.channels ch ON ch.id = cm.channel_id
  WHERE cm.sender_type = 'agent'
    AND cm.sender_id IN (SELECT agent_key FROM team_agents)
    AND cm.created_at >= (SELECT start_at FROM bounds)
    AND cm.created_at <  (SELECT end_at FROM bounds)
  ORDER BY cm.created_at DESC
  LIMIT 50
),
recent_automations AS (
  SELECT
    'automation'::TEXT AS kind,
    r.id, r.space_id, s.title AS space_title,
    r.automation_id, r.status, r.linked_mission_id,
    r.created_at AS happened_at
  FROM public.space_automation_runs r
  LEFT JOIN public.spaces s ON s.id = r.space_id
  WHERE r.created_at >= (SELECT start_at FROM bounds)
    AND r.created_at <  (SELECT end_at FROM bounds)
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(r.actions_executed) a(action_row)
      WHERE action_row->>'agent_key' IN (SELECT agent_key FROM team_agents)
         OR action_row->'action'->>'agent_key' IN (SELECT agent_key FROM team_agents)
    )
  ORDER BY r.created_at DESC
  LIMIT 50
),
recent_chats AS (
  SELECT
    'chat'::TEXT AS kind,
    t.conversation_id AS id,
    COALESCE(max(c.title), 'Conversation') AS conversation_title,
    (array_agg(t.agent_key ORDER BY t.created_at DESC))[1] AS agent_key,
    count(*)::int AS reply_count,
    max(t.created_at) AS happened_at
  FROM public.vb_agent_traces t
  LEFT JOIN public.conversations c ON c.id = t.conversation_id
  WHERE t.agent_key IN (SELECT agent_key FROM team_agents)
    AND t.conversation_id IS NOT NULL
    AND t.status IN ('completed', 'failed')
    AND t.created_at >= (SELECT start_at FROM bounds)
    AND t.created_at <  (SELECT end_at FROM bounds)
  GROUP BY t.conversation_id
  ORDER BY max(t.created_at) DESC
)
SELECT jsonb_build_object(
  'team_id', p_team_id,
  'generated_at', now(),
  'window', jsonb_build_object(
    'start', (SELECT start_at FROM bounds),
    'end', (SELECT end_at FROM bounds),
    'prev_start', (SELECT prev_start FROM bounds),
    'prev_end', (SELECT prev_end FROM bounds)
  ),
  'agents', (SELECT COALESCE(jsonb_agg(to_jsonb(ta) ORDER BY ta.name), '[]'::jsonb) FROM team_agents ta),
  'kpis', jsonb_build_object(
    'agents_by_status', (SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb) FROM agent_status),
    'missions', (
      SELECT jsonb_build_object(
        'active', count(*) FILTER (WHERE status IN ('planning', 'in_progress', 'review')),
        'blocked', count(*) FILTER (WHERE status = 'blocked'),
        'todo', count(*) FILTER (WHERE status IN ('todo', 'inbox')),
        'completed', count(*) FILTER (WHERE status = 'done'),
        'failed', count(*) FILTER (WHERE status IN ('failed', 'error'))
      )
      FROM mission_rollup
    ),
    'window', (
      SELECT jsonb_build_object(
        'completed', (SELECT count(*)::int FROM window_missions WHERE status = 'done'),
        'failed',    (SELECT count(*)::int FROM window_missions WHERE status IN ('failed','error')),
        'avg_duration_minutes', (
          SELECT COALESCE(
            ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - COALESCE(created_at, completed_at))) / 60.0))::int,
            0
          )
          FROM window_missions
          WHERE status = 'done'
        ),
        'prev_completed', (SELECT count(*)::int FROM prev_window_missions WHERE status = 'done'),
        'prev_failed',    (SELECT count(*)::int FROM prev_window_missions WHERE status IN ('failed','error'))
      )
    )
  ),
  'series', jsonb_build_object(
    'missions_completed_daily', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'n', n) ORDER BY day), '[]'::jsonb)
      FROM series_missions
    ),
    'missions_failed_daily', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'n', n) ORDER BY day), '[]'::jsonb)
      FROM series_failures
    ),
    'chats_daily', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'n', n) ORDER BY day), '[]'::jsonb)
      FROM series_chats
    ),
    'channel_posts_daily', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'n', n) ORDER BY day), '[]'::jsonb)
      FROM series_channel
    ),
    'automations_daily', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'n', n) ORDER BY day), '[]'::jsonb)
      FROM series_automations
    )
  ),
  'per_agent', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'agent_key', paw.agent_key,
        'completed', paw.completed,
        'failed', paw.failed,
        'live_active', COALESCE(pal.live_active, 0),
        'live_blocked', COALESCE(pal.live_blocked, 0)
      )
      ORDER BY paw.completed DESC, paw.agent_key
    ), '[]'::jsonb)
    FROM per_agent_window paw
    LEFT JOIN per_agent_live pal ON pal.agent_key = paw.agent_key
  ),
  'coverage', jsonb_build_object(
    'by_campaign', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'completed', completed
      )), '[]'::jsonb)
      FROM coverage_campaign
    ),
    'by_channel', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'posts', posts
      )), '[]'::jsonb)
      FROM coverage_channel
    )
  ),
  'live', jsonb_build_object(
    'missions',    (SELECT COALESCE(jsonb_agg(to_jsonb(lm) ORDER BY lm.happened_at DESC), '[]'::jsonb) FROM live_missions lm),
    'tasks',       (SELECT COALESCE(jsonb_agg(to_jsonb(lt) ORDER BY lt.happened_at DESC), '[]'::jsonb) FROM live_tasks lt),
    'traces',      (SELECT COALESCE(jsonb_agg(to_jsonb(t)  ORDER BY t.happened_at  DESC), '[]'::jsonb) FROM live_traces t),
    'delegations', (SELECT COALESCE(jsonb_agg(to_jsonb(d)  ORDER BY d.happened_at  DESC), '[]'::jsonb) FROM live_delegations d)
  ),
  'recent', jsonb_build_object(
    'missions',    (SELECT COALESCE(jsonb_agg(to_jsonb(rm) ORDER BY rm.happened_at DESC), '[]'::jsonb) FROM recent_missions rm),
    'chats',       (SELECT COALESCE(jsonb_agg(to_jsonb(rch) ORDER BY rch.happened_at DESC), '[]'::jsonb) FROM recent_chats rch),
    'channel',     (SELECT COALESCE(jsonb_agg(to_jsonb(rc) ORDER BY rc.happened_at DESC), '[]'::jsonb) FROM recent_channel rc),
    'automations', (SELECT COALESCE(jsonb_agg(to_jsonb(ra) ORDER BY ra.happened_at DESC), '[]'::jsonb) FROM recent_automations ra)
  )
);
$$;

COMMIT;
