-- Optional funnel / sequence scoping for campaign analytics RPCs.
-- p_funnel_ids / p_sequence_ids: NULL or empty = no extra filter (all funnels / sequences).

DROP FUNCTION IF EXISTS public.get_campaign_analytics(uuid, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_campaign_analytics(
  p_campaign_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_funnel_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  WITH lead_stats AS (
    SELECT
      COUNT(*) AS total_leads,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) AS unique_visitors
    FROM leads
    WHERE campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
      AND (
        p_funnel_ids IS NULL
        OR funnel_id = ANY (p_funnel_ids)
      )
  ),
  daily_stats AS (
    SELECT
      DATE(created_at) AS day,
      COUNT(*) AS leads,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) AS visitors
    FROM leads
    WHERE campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
      AND (
        p_funnel_ids IS NULL
        OR funnel_id = ANY (p_funnel_ids)
      )
    GROUP BY DATE(created_at)
    ORDER BY day
  )
  SELECT json_build_object(
    'visitors', COALESCE((SELECT unique_visitors FROM lead_stats), 0),
    'total_views', COALESCE((SELECT total_leads FROM lead_stats), 0),
    'leads', COALESCE((SELECT total_leads FROM lead_stats), 0),
    'conversion_rate', CASE
      WHEN COALESCE((SELECT unique_visitors FROM lead_stats), 0) = 0 THEN 0
      ELSE ROUND(((SELECT total_leads FROM lead_stats)::NUMERIC / (SELECT unique_visitors FROM lead_stats)::NUMERIC) * 100, 2)
    END,
    'chart_data', COALESCE(
      (SELECT json_agg(json_build_object('date', day, 'visitors', visitors, 'leads', leads)) FROM daily_stats),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_analytics(uuid, timestamp with time zone, timestamp with time zone, uuid[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_campaign_email_analytics(uuid, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_campaign_email_analytics(
  p_campaign_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_sequence_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  WITH seq AS (
    SELECT s.id
    FROM public.sequences s
    WHERE s.campaign_id = p_campaign_id
      AND (
        p_sequence_ids IS NULL
        OR s.id = ANY (p_sequence_ids)
      )
  ),
  sends AS (
    SELECT es.*
    FROM public.email_sends es
    WHERE es.sequence_id IN (SELECT id FROM seq)
  ),
  stats AS (
    SELECT
      count(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
      count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
      count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
      count(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
      count(*) FILTER (WHERE status IN ('bounced', 'failed')) AS bounced
    FROM sends
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  daily_opens AS (
    SELECT
      date(opened_at) AS day,
      count(*) AS opens
    FROM sends
    WHERE opened_at IS NOT NULL
      AND (p_start_date IS NULL OR opened_at >= p_start_date)
      AND (p_end_date IS NULL OR opened_at <= p_end_date)
    GROUP BY date(opened_at)
  ),
  daily_clicks AS (
    SELECT
      date(clicked_at) AS day,
      count(*) AS clicks
    FROM sends
    WHERE clicked_at IS NOT NULL
      AND (p_start_date IS NULL OR clicked_at >= p_start_date)
      AND (p_end_date IS NULL OR clicked_at <= p_end_date)
    GROUP BY date(clicked_at)
  ),
  daily AS (
    SELECT
      d.day,
      coalesce(o.opens, 0) AS opens,
      coalesce(c.clicks, 0) AS clicks
    FROM (
      SELECT day FROM daily_opens
      UNION
      SELECT day FROM daily_clicks
    ) d
    LEFT JOIN daily_opens o ON o.day = d.day
    LEFT JOIN daily_clicks c ON c.day = d.day
    ORDER BY d.day
  )
  SELECT json_build_object(
    'sent', coalesce((SELECT sent FROM stats), 0),
    'delivered', coalesce((SELECT delivered FROM stats), 0),
    'opened', coalesce((SELECT opened FROM stats), 0),
    'clicked', coalesce((SELECT clicked FROM stats), 0),
    'bounced', coalesce((SELECT bounced FROM stats), 0),
    'open_rate',
      CASE
        WHEN coalesce((SELECT sent FROM stats), 0) = 0 THEN 0
        ELSE round(
          (coalesce((SELECT opened FROM stats), 0)::numeric /
           nullif((SELECT sent FROM stats), 0)::numeric) * 100,
          2
        )
      END,
    'click_rate',
      CASE
        WHEN coalesce((SELECT sent FROM stats), 0) = 0 THEN 0
        ELSE round(
          (coalesce((SELECT clicked FROM stats), 0)::numeric /
           nullif((SELECT sent FROM stats), 0)::numeric) * 100,
          2
        )
      END,
    'chart_data',
      coalesce(
        (SELECT json_agg(json_build_object('date', day, 'opens', opens, 'clicks', clicks)) FROM daily),
        '[]'::json
      )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_email_analytics(uuid, timestamp with time zone, timestamp with time zone, uuid[]) TO authenticated;
