-- Agent spending RPCs: resolve agent via 3 fallback layers:
-- 1. conversation.agent_id → agents_registry
-- 2. mission events: e.action = agent_key → agents_registry
-- 3. feature-based: brain→atlas, media/scrapecreators/transcribe/ads→vibey

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
