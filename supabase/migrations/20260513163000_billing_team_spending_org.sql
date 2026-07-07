-- Team-scoped spending RPC for the Team Analytics tab.
-- Sums ai_usage_events for humans in `agent_team_members.team_id = p_team_id`
-- inside the [p_start, p_end] window, plus a same-length previous-window
-- total for delta calc and a daily series (zero-filled across every day in
-- the window) for charting.

CREATE OR REPLACE FUNCTION public.billing_team_spending_org(
  p_org_id uuid,
  p_team_id uuid,
  p_start timestamptz,
  p_end timestamptz
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
    AND e.created_at <= p_end;

  SELECT
    COALESCE(SUM(e.credits_charged), 0)::bigint,
    COALESCE(ROUND((SUM(e.credits_charged)::numeric / 200.0)::numeric, 4), 0)::numeric,
    COUNT(*)::bigint
  INTO v_prev_credits, v_prev_cost, v_prev_events
  FROM public.ai_usage_events e
  JOIN public.agent_team_members m ON m.user_id = e.user_id AND m.team_id = p_team_id
  WHERE e.org_id = p_org_id
    AND e.created_at >= v_prev_start
    AND e.created_at < v_prev_end;

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
