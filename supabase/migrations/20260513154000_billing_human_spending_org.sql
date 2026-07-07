-- Per-human spending RPC for an org. Groups ai_usage_events by user_id
-- and returns credits, computed_cost (USD), event count, last activity.
-- Mirrors billing_agent_spending_org's security pattern (is_org_member gate).

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
