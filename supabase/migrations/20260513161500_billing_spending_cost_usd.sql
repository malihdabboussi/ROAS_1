-- Add cost_usd directly to spending RPCs so the FE has no math.
-- credits_charged is already post-margin, post-discount; cost_usd = credits / 200
-- (matches the public credit-pack rate of 200 credits = $1).

CREATE OR REPLACE FUNCTION public.billing_human_spending_org(
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
  humans jsonb;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

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
    GROUP BY e.user_id
  ) h;

  RETURN jsonb_build_object('humans', humans);
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
    GROUP BY COALESCE(ar.agent_key, ar2.agent_key, ar3.agent_key, '__system__'),
             COALESCE(ar.name, ar2.name, ar3.name, 'System')
  ) a;

  RETURN jsonb_build_object('agents', agents);
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
      ON ar.agent_key = c.agent_id
      AND (
        (e.org_id IS NOT NULL AND ar.org_id = e.org_id)
        OR (e.org_id IS NULL AND ar.org_id IS NULL AND ar.user_id = e.user_id)
      )
    LEFT JOIN public.agents_registry ar2
      ON ar.agent_key IS NULL
      AND e.feature = 'mission'
      AND ar2.agent_key = e.action
      AND (
        (e.org_id IS NOT NULL AND ar2.org_id = e.org_id)
        OR (e.org_id IS NULL AND ar2.org_id IS NULL AND ar2.user_id = e.user_id)
      )
    LEFT JOIN public.agents_registry ar3
      ON ar.agent_key IS NULL AND ar2.agent_key IS NULL
      AND ar3.agent_key = CASE
        WHEN e.feature = 'brain' THEN 'atlas'
        WHEN e.feature IN ('media','scrapecreators','transcribe','ads') THEN 'vibey'
        ELSE NULL
      END
      AND (
        (e.org_id IS NOT NULL AND ar3.org_id = e.org_id)
        OR (e.org_id IS NULL AND ar3.org_id IS NULL AND ar3.user_id = e.user_id)
      )
    WHERE e.user_id = v_uid
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY COALESCE(ar.agent_key, ar2.agent_key, ar3.agent_key, '__system__'),
             COALESCE(ar.name, ar2.name, ar3.name, 'System')
  ) a;

  RETURN jsonb_build_object('agents', agents);
END;
$$;
