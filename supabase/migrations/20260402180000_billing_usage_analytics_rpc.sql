-- RPC helpers for billing usage analytics (daily + category aggregates, per-agent spend).
-- SECURITY DEFINER captures auth.uid() at call time; body filters by user_id / org membership.

CREATE OR REPLACE FUNCTION public.billing_usage_analytics_personal(
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
  v_uid uuid := auth.uid();
  daily jsonb;
  cats jsonb;
  tot_credits bigint;
  tot_events bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'dailySpending', '[]'::jsonb,
      'categoryBreakdown', '[]'::jsonb,
      'totalCreditsSpent', 0,
      'totalEvents', 0
    );
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', day::text, 'credits', s)
    ORDER BY day
  ), '[]'::jsonb)
  INTO daily
  FROM (
    SELECT (e.created_at AT TIME ZONE 'UTC')::date AS day,
           SUM(e.credits_charged)::bigint AS s
    FROM public.ai_usage_events e
    WHERE e.user_id = v_uid
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY day
  ) d;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'feature', f.feature,
      'credits', f.s,
      'count', f.cnt
    ) ORDER BY f.s DESC
  ), '[]'::jsonb)
  INTO cats
  FROM (
    SELECT e.feature,
           SUM(e.credits_charged)::bigint AS s,
           COUNT(*)::bigint AS cnt
    FROM public.ai_usage_events e
    WHERE e.user_id = v_uid
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY e.feature
  ) f;

  SELECT COALESCE(SUM(e.credits_charged), 0)::bigint, COUNT(*)::bigint
  INTO tot_credits, tot_events
  FROM public.ai_usage_events e
  WHERE e.user_id = v_uid
    AND e.created_at >= p_start
    AND e.created_at <= p_end;

  RETURN jsonb_build_object(
    'dailySpending', daily,
    'categoryBreakdown', cats,
    'totalCreditsSpent', tot_credits,
    'totalEvents', tot_events
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_usage_analytics_org(
  p_org_id uuid,
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
  daily jsonb;
  cats jsonb;
  tot_credits bigint;
  tot_events bigint;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', day::text, 'credits', s)
    ORDER BY day
  ), '[]'::jsonb)
  INTO daily
  FROM (
    SELECT (e.created_at AT TIME ZONE 'UTC')::date AS day,
           SUM(e.credits_charged)::bigint AS s
    FROM public.ai_usage_events e
    WHERE e.org_id = p_org_id
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY day
  ) d;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'feature', f.feature,
      'credits', f.s,
      'count', f.cnt
    ) ORDER BY f.s DESC
  ), '[]'::jsonb)
  INTO cats
  FROM (
    SELECT e.feature,
           SUM(e.credits_charged)::bigint AS s,
           COUNT(*)::bigint AS cnt
    FROM public.ai_usage_events e
    WHERE e.org_id = p_org_id
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY e.feature
  ) f;

  SELECT COALESCE(SUM(e.credits_charged), 0)::bigint, COUNT(*)::bigint
  INTO tot_credits, tot_events
  FROM public.ai_usage_events e
  WHERE e.org_id = p_org_id
    AND e.created_at >= p_start
    AND e.created_at <= p_end;

  RETURN jsonb_build_object(
    'dailySpending', daily,
    'categoryBreakdown', cats,
    'totalCreditsSpent', tot_credits,
    'totalEvents', tot_events
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_agent_spending_personal(
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
  v_uid uuid := auth.uid();
  agents jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('agents', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'agentKey', a.agent_key,
      'agentName', a.agent_name,
      'credits', a.credits,
      'eventCount', a.event_count
    ) ORDER BY a.credits DESC
  ), '[]'::jsonb)
  INTO agents
  FROM (
    SELECT
      COALESCE(ar.agent_key, '__other__') AS agent_key,
      COALESCE(ar.name, 'Other / System') AS agent_name,
      SUM(e.credits_charged)::bigint AS credits,
      COUNT(*)::bigint AS event_count
    FROM public.ai_usage_events e
    LEFT JOIN public.conversations c ON c.id = e.conversation_id
    LEFT JOIN public.agents_registry ar
      ON ar.agent_key = c.agent_id
      AND (
        (e.org_id IS NOT NULL AND ar.org_id = e.org_id)
        OR (e.org_id IS NULL AND ar.org_id IS NULL AND ar.user_id = e.user_id)
      )
    WHERE e.user_id = v_uid
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY ar.agent_key, ar.name
  ) a;

  RETURN jsonb_build_object('agents', agents);
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_agent_spending_org(
  p_org_id uuid,
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
  agents jsonb;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'agentKey', a.agent_key,
      'agentName', a.agent_name,
      'credits', a.credits,
      'eventCount', a.event_count
    ) ORDER BY a.credits DESC
  ), '[]'::jsonb)
  INTO agents
  FROM (
    SELECT
      COALESCE(ar.agent_key, '__other__') AS agent_key,
      COALESCE(ar.name, 'Other / System') AS agent_name,
      SUM(e.credits_charged)::bigint AS credits,
      COUNT(*)::bigint AS event_count
    FROM public.ai_usage_events e
    LEFT JOIN public.conversations c ON c.id = e.conversation_id
    LEFT JOIN public.agents_registry ar
      ON ar.agent_key = c.agent_id AND ar.org_id = p_org_id
    WHERE e.org_id = p_org_id
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY ar.agent_key, ar.name
  ) a;

  RETURN jsonb_build_object('agents', agents);
END;
$$;

REVOKE ALL ON FUNCTION public.billing_usage_analytics_personal(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.billing_usage_analytics_org(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.billing_agent_spending_personal(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.billing_agent_spending_org(uuid, timestamptz, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.billing_usage_analytics_personal(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_usage_analytics_org(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_agent_spending_personal(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_agent_spending_org(uuid, timestamptz, timestamptz) TO authenticated;
