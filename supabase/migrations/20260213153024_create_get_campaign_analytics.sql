
CREATE OR REPLACE FUNCTION get_campaign_analytics(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
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

GRANT EXECUTE ON FUNCTION get_campaign_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
;
