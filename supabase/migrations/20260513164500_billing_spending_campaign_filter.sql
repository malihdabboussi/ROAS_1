-- Add optional campaign filter (uuid[]) to team / agent-org / human-org spending RPCs.
-- p_campaign_ids = NULL or empty array means "all campaigns".

CREATE OR REPLACE FUNCTION public.billing_team_spending_org(
  p_org_id uuid,
  p_team_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_campaign_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_seconds bigint;
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_no_filter boolean;
  v_total_credits bigint;
  v_total_cost numeric;
  v_total_events bigint;
  v_prev_credits bigint;
  v_prev_cost numeric;
  v_prev_events bigint;
  v_daily jsonb;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_no_filter := p_campaign_ids IS NULL OR array_length(p_campaign_ids, 1) IS NULL;
  v_window_seconds := GREATEST(1, EXTRACT(EPOCH FROM (p_end - p_start))::bigint);
  v_prev_end := p_start;
  v_prev_start := p_start - make_interval(secs => v_window_seconds);

  SELECT
    COALESCE(SUM(e.credits_charged), 0)::bigint,
    COALESCE(ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4), 0)::numeric,
    COUNT(*)::bigint
  INTO v_total_credits, v_total_cost, v_total_events
  FROM public.ai_usage_events e
  JOIN public.agent_team_members m ON m.user_id = e.user_id AND m.team_id = p_team_id
  WHERE e.org_id = p_org_id
    AND e.created_at >= p_start
    AND e.created_at <= p_end
    AND (v_no_filter OR e.campaign_id = ANY(p_campaign_ids));

  SELECT
    COALESCE(SUM(e.credits_charged), 0)::bigint,
    COALESCE(ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4), 0)::numeric,
    COUNT(*)::bigint
  INTO v_prev_credits, v_prev_cost, v_prev_events
  FROM public.ai_usage_events e
  JOIN public.agent_team_members m ON m.user_id = e.user_id AND m.team_id = p_team_id
  WHERE e.org_id = p_org_id
    AND e.created_at >= v_prev_start
    AND e.created_at < v_prev_end
    AND (v_no_filter OR e.campaign_id = ANY(p_campaign_ids));

  WITH days AS (
    SELECT generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end),
      interval '1 day'
    )::date AS day
  ),
  daily AS (
    SELECT
      date_trunc('day', e.created_at)::date AS day,
      SUM(e.credits_charged)::bigint AS credits,
      ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4) AS cost_usd,
      COUNT(*)::bigint AS event_count
    FROM public.ai_usage_events e
    JOIN public.agent_team_members m ON m.user_id = e.user_id AND m.team_id = p_team_id
    WHERE e.org_id = p_org_id
      AND e.created_at >= p_start
      AND e.created_at <= p_end
      AND (v_no_filter OR e.campaign_id = ANY(p_campaign_ids))
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'credits', COALESCE(daily.credits, 0),
      'costUsd', COALESCE(daily.cost_usd, 0),
      'eventCount', COALESCE(daily.event_count, 0)
    ) ORDER BY d.day
  ), '[]'::jsonb)
  INTO v_daily
  FROM days d
  LEFT JOIN daily ON daily.day = d.day;

  RETURN jsonb_build_object(
    'totals', jsonb_build_object(
      'credits', v_total_credits,
      'costUsd', v_total_cost,
      'eventCount', v_total_events
    ),
    'previousTotals', jsonb_build_object(
      'credits', v_prev_credits,
      'costUsd', v_prev_cost,
      'eventCount', v_prev_events
    ),
    'daily', v_daily
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_human_spending_org(
  p_org_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_campaign_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_no_filter boolean;
  humans jsonb;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_no_filter := p_campaign_ids IS NULL OR array_length(p_campaign_ids, 1) IS NULL;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'userId', h.user_id,
      'credits', h.credits,
      'costUsd', h.cost_usd,
      'computedCost', h.computed_cost,
      'eventCount', h.event_count,
      'lastActiveAt', h.last_active_at
    ) ORDER BY h.credits DESC
  ), '[]'::jsonb)
  INTO humans
  FROM (
    SELECT
      e.user_id,
      SUM(e.credits_charged)::bigint AS credits,
      ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4) AS cost_usd,
      SUM(COALESCE(e.computed_cost, 0))::numeric AS computed_cost,
      COUNT(*)::bigint AS event_count,
      MAX(e.created_at) AS last_active_at
    FROM public.ai_usage_events e
    WHERE e.org_id = p_org_id
      AND e.user_id IS NOT NULL
      AND e.created_at >= p_start
      AND e.created_at <= p_end
      AND (v_no_filter OR e.campaign_id = ANY(p_campaign_ids))
    GROUP BY e.user_id
  ) h;

  RETURN jsonb_build_object('humans', humans);
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_agent_spending_org(
  p_org_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_campaign_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_no_filter boolean;
  agents jsonb;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_no_filter := p_campaign_ids IS NULL OR array_length(p_campaign_ids, 1) IS NULL;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'agentKey', a.resolved_key,
      'agentName', a.resolved_name,
      'imageUrl', to_jsonb(a.image_url),
      'credits', a.credits,
      'costUsd', a.cost_usd,
      'eventCount', a.event_count
    ) ORDER BY a.credits DESC
  ), '[]'::jsonb)
  INTO agents
  FROM (
    SELECT
      COALESCE(ar.agent_key, ar2.agent_key, ar3.agent_key, '__system__') AS resolved_key,
      COALESCE(ar.name, ar2.name, ar3.name, 'System') AS resolved_name,
      COALESCE(MAX(ar.image_url), MAX(ar2.image_url), MAX(ar3.image_url)) AS image_url,
      SUM(e.credits_charged)::bigint AS credits,
      ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4) AS cost_usd,
      COUNT(*)::bigint AS event_count
    FROM public.ai_usage_events e
    LEFT JOIN public.conversations c ON c.id = e.conversation_id
    LEFT JOIN public.agents_registry ar
      ON ar.agent_key = c.agent_id AND ar.org_id = p_org_id
    LEFT JOIN public.agents_registry ar2
      ON ar.agent_key IS NULL
      AND e.feature = 'mission'
      AND ar2.agent_key = e.action
      AND ar2.org_id = p_org_id
    LEFT JOIN public.agents_registry ar3
      ON ar.agent_key IS NULL AND ar2.agent_key IS NULL
      AND ar3.agent_key = CASE
        WHEN e.feature = 'brain' THEN 'atlas'
        WHEN e.feature IN ('media','scrapecreators','transcribe','ads') THEN 'vibey'
        ELSE NULL
      END
      AND ar3.org_id = p_org_id
    WHERE e.org_id = p_org_id
      AND e.created_at >= p_start
      AND e.created_at <= p_end
      AND (v_no_filter OR e.campaign_id = ANY(p_campaign_ids))
    GROUP BY COALESCE(ar.agent_key, ar2.agent_key, ar3.agent_key, '__system__'),
             COALESCE(ar.name, ar2.name, ar3.name, 'System')
  ) a;

  RETURN jsonb_build_object('agents', agents);
END;
$$;
