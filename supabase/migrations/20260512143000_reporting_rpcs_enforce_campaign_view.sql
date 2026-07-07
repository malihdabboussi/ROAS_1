-- Reporting SECURITY DEFINER RPCs: require authenticated caller with org campaign view access.

-- Adds enforce_campaign_view_for_rpc + PERFORM guards on funnel/email analytics and dashboard widget RPCs.

CREATE OR REPLACE FUNCTION public.enforce_campaign_view_for_rpc(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_org_campaign_access(p_campaign_id, 'view') THEN
    RAISE EXCEPTION 'campaign access denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

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
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

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
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

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

-- Dashboard reporting RPCs for campaign overview extended widgets (Phases 3–4).

CREATE OR REPLACE FUNCTION public.get_campaign_contact_stats(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_cur int;
  v_prev int;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_prev_start := p_start_date - (p_end_date - p_start_date);
    v_prev_end := p_start_date - interval '1 microsecond';
    SELECT count(*)::int INTO v_cur
    FROM public.contact_campaign_memberships m
    WHERE m.campaign_id = p_campaign_id
      AND m.first_seen_at >= p_start_date
      AND m.first_seen_at <= p_end_date;
    SELECT count(*)::int INTO v_prev
    FROM public.contact_campaign_memberships m
    WHERE m.campaign_id = p_campaign_id
      AND m.first_seen_at >= v_prev_start
      AND m.first_seen_at <= v_prev_end;
  ELSE
    SELECT count(*)::int INTO v_cur
    FROM public.contact_campaign_memberships m
    WHERE m.campaign_id = p_campaign_id;
    v_prev := 0;
  END IF;

  SELECT json_build_object(
    'current_count', coalesce(v_cur, 0),
    'previous_count', coalesce(v_prev, 0)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_contact_stats(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_contacts_timeseries(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT coalesce(
    json_agg(json_build_object('date', day, 'count', cnt) ORDER BY day),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT date(m.first_seen_at) AS day, count(*)::int AS cnt
    FROM public.contact_campaign_memberships m
    WHERE m.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR m.first_seen_at >= p_start_date)
      AND (p_end_date IS NULL OR m.first_seen_at <= p_end_date)
    GROUP BY date(m.first_seen_at)
  ) sub;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_contacts_timeseries(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_deliverables_by_type(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT coalesce(
    json_agg(json_build_object('type', t, 'count', c) ORDER BY c DESC),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT d.type AS t, count(*)::int AS c
    FROM public.mission_deliverables d
    INNER JOIN public.missions m ON m.id = d.mission_id
    WHERE m.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR d.created_at >= p_start_date)
      AND (p_end_date IS NULL OR d.created_at <= p_end_date)
    GROUP BY d.type
  ) sub;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_deliverables_by_type(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_sequence_aggregate_stats(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_active int;
  v_sent int;
  v_opened int;
  v_clicked int;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT count(*)::int INTO v_active
  FROM public.sequences s
  WHERE s.campaign_id = p_campaign_id;

  SELECT
    count(*) FILTER (WHERE es.sent_at IS NOT NULL)::int,
    count(*) FILTER (WHERE es.opened_at IS NOT NULL)::int,
    count(*) FILTER (WHERE es.clicked_at IS NOT NULL)::int
  INTO v_sent, v_opened, v_clicked
  FROM public.email_sends es
  INNER JOIN public.sequences s ON s.id = es.sequence_id AND s.campaign_id = p_campaign_id
  WHERE (p_start_date IS NULL OR es.created_at >= p_start_date)
    AND (p_end_date IS NULL OR es.created_at <= p_end_date);

  SELECT json_build_object(
    'active_sequences', coalesce(v_active, 0),
    'total_sent', coalesce(v_sent, 0),
    'open_rate',
      CASE WHEN coalesce(v_sent, 0) = 0 THEN 0::numeric
      ELSE round((v_opened::numeric / v_sent::numeric) * 100, 2) END,
    'click_rate',
      CASE WHEN coalesce(v_sent, 0) = 0 THEN 0::numeric
      ELSE round((v_clicked::numeric / v_sent::numeric) * 100, 2) END
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_sequence_aggregate_stats(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_top_email_row(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT json_build_object(
    'subject', subj,
    'sent', snt,
    'open_rate', opr,
    'click_rate', clr
  )
  INTO result
  FROM (
    SELECT
      coalesce(nullif(trim(es.subject), ''), '(no subject)') AS subj,
      count(*)::int AS snt,
      CASE WHEN count(*) = 0 THEN 0::numeric
        ELSE round((count(*) FILTER (WHERE es.opened_at IS NOT NULL)::numeric / count(*)::numeric) * 100, 2)
      END AS opr,
      CASE WHEN count(*) = 0 THEN 0::numeric
        ELSE round((count(*) FILTER (WHERE es.clicked_at IS NOT NULL)::numeric / count(*)::numeric) * 100, 2)
      END AS clr
    FROM public.email_sends es
    INNER JOIN public.sequences s ON s.id = es.sequence_id AND s.campaign_id = p_campaign_id
    WHERE (p_start_date IS NULL OR es.created_at >= p_start_date)
      AND (p_end_date IS NULL OR es.created_at <= p_end_date)
    GROUP BY coalesce(nullif(trim(es.subject), ''), '(no subject)')
    HAVING count(*) >= 1
    ORDER BY
      (count(*) FILTER (WHERE es.opened_at IS NOT NULL)::numeric / nullif(count(*)::numeric, 0)) DESC NULLS LAST,
      count(*) DESC
    LIMIT 1
  ) x;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_top_email_row(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_top_funnels(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit int DEFAULT 5,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT coalesce(
    json_agg(
      json_build_object(
        'funnel_id', fid,
        'name', fn,
        'visitors', vis,
        'leads', lds,
        'conversion_rate', cr
      ) ORDER BY lds DESC, cr DESC
    ),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      f.id AS fid,
      coalesce(nullif(trim(f.name), ''), 'Funnel') AS fn,
      (
        SELECT count(DISTINCT v.visitor_hash)::int
        FROM public.visitors_page_views v
        WHERE v.funnel_id = f.id
          AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
          AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
      ) AS vis,
      (
        SELECT count(*)::int
        FROM public.leads l
        WHERE l.funnel_id = f.id
          AND (p_start_date IS NULL OR l.created_at >= p_start_date)
          AND (p_end_date IS NULL OR l.created_at <= p_end_date)
      ) AS lds,
      CASE
        WHEN (
          SELECT count(DISTINCT v.visitor_hash)::numeric
          FROM public.visitors_page_views v
          WHERE v.funnel_id = f.id
            AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
            AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
        ) = 0 THEN 0::numeric
        ELSE round(
          (
            (SELECT count(*)::numeric FROM public.leads l WHERE l.funnel_id = f.id
              AND (p_start_date IS NULL OR l.created_at >= p_start_date)
              AND (p_end_date IS NULL OR l.created_at <= p_end_date))
            /
            NULLIF(
              (SELECT count(DISTINCT v.visitor_hash)::numeric FROM public.visitors_page_views v WHERE v.funnel_id = f.id
                AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
                AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)),
              0
            )
          ) * 100,
          2
        )
      END AS cr
    FROM public.funnels f
    WHERE f.campaign_id = p_campaign_id
    ORDER BY lds DESC NULLS LAST
    LIMIT coalesce(nullif(p_limit, 0), 5)
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_top_funnels(uuid, timestamp with time zone, timestamp with time zone, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_contact_source_breakdown(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT coalesce(
    json_agg(json_build_object('source', src, 'count', cnt) ORDER BY cnt DESC),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      coalesce(nullif(trim(c.contact_source), ''), nullif(trim(c.source::text), ''), 'unknown') AS src,
      count(*)::int AS cnt
    FROM public.contact_campaign_memberships m
    INNER JOIN public.contacts c ON c.id = m.contact_id
    WHERE m.campaign_id = p_campaign_id
      AND (p_start_date IS NULL OR m.first_seen_at >= p_start_date)
      AND (p_end_date IS NULL OR m.first_seen_at <= p_end_date)
    GROUP BY 1
  ) sub;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_contact_source_breakdown(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_lead_customer_split(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_leads int;
  v_customers int;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT
    count(*) FILTER (WHERE c.contact_type = 'lead')::int,
    count(*) FILTER (WHERE c.contact_type = 'customer')::int
  INTO v_leads, v_customers
  FROM public.contact_campaign_memberships m
  INNER JOIN public.contacts c ON c.id = m.contact_id
  WHERE m.campaign_id = p_campaign_id
    AND (p_start_date IS NULL OR m.first_seen_at >= p_start_date)
    AND (p_end_date IS NULL OR m.first_seen_at <= p_end_date);

  SELECT json_build_object(
    'leads', coalesce(v_leads, 0),
    'customers', coalesce(v_customers, 0),
    'conversion_pct',
      CASE WHEN coalesce(v_leads, 0) + coalesce(v_customers, 0) = 0 THEN 0::numeric
      ELSE round(
        (coalesce(v_customers, 0)::numeric / (coalesce(v_leads, 0) + coalesce(v_customers, 0))::numeric) * 100,
        2
      ) END
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_lead_customer_split(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_funnel_dropoff(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_funnel_id uuid;
  v_funnel_name text;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT f.id, coalesce(nullif(trim(f.name), ''), 'Funnel')
  INTO v_funnel_id, v_funnel_name
  FROM public.funnels f
  WHERE f.campaign_id = p_campaign_id
  ORDER BY (
    SELECT count(*)::int FROM public.visitors_page_views v
    WHERE v.funnel_id = f.id
      AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
      AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
  ) DESC NULLS LAST
  LIMIT 1;

  IF v_funnel_id IS NULL THEN
    RETURN json_build_object(
      'funnel_id', NULL,
      'funnel_name', NULL,
      'steps', '[]'::json
    );
  END IF;

  WITH pages AS (
    SELECT fp.id, coalesce(nullif(trim(fp.name), ''), fp.path::text, 'Page') AS page_name, fp.order_index
    FROM public.funnel_pages fp
    WHERE fp.funnel_id = v_funnel_id
    ORDER BY fp.order_index ASC, fp.created_at ASC
  ),
  views AS (
    SELECT
      p.id AS page_id,
      p.page_name,
      p.order_index,
      (
        SELECT count(DISTINCT v.visitor_hash)::int
        FROM public.visitors_page_views v
        WHERE v.funnel_page_id = p.id
          AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
          AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
      ) AS views
    FROM pages p
    ORDER BY p.order_index ASC
  ),
  numbered AS (
    SELECT
      *,
      lag(views) OVER (ORDER BY order_index) AS prev_views
    FROM views
  )
  SELECT json_build_object(
    'funnel_id', v_funnel_id,
    'funnel_name', v_funnel_name,
    'steps', (
      SELECT coalesce(
        json_agg(
          json_build_object(
            'page_name', page_name,
            'views', views,
            'drop_off_pct',
              CASE
                WHEN prev_views IS NULL OR prev_views = 0 THEN 0::numeric
                ELSE round(((prev_views - views)::numeric / prev_views::numeric) * 100, 1)
              END
          ) ORDER BY order_index
        ),
        '[]'::json
      )
      FROM numbered
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_funnel_dropoff(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campaign_ads_budget_sum(
  p_campaign_id uuid,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_sum numeric;
BEGIN
  PERFORM public.enforce_campaign_view_for_rpc(p_campaign_id);

  SELECT coalesce(sum(s.daily_budget::numeric), 0) INTO v_sum
  FROM public.ad_sets s
  INNER JOIN public.ad_campaigns ac ON ac.id = s.ad_campaign_id
  WHERE ac.campaign_id = p_campaign_id;

  SELECT json_build_object(
    'ads_daily_budget_sum', round(v_sum, 2),
    'note', 'Sum of Meta ad set daily budgets (estimate; not actual spend)'
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_ads_budget_sum(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_campaign_leaderboard(
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit int DEFAULT 8,
  p_start_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT coalesce(
    json_agg(
      json_build_object(
        'campaign_id', cid,
        'name', cname,
        'leads', ldc,
        'visitors', vdc,
        'score', sc
      ) ORDER BY sc DESC
    ),
    '[]'::json
  )
  INTO result
  FROM (
    SELECT
      c.id AS cid,
      coalesce(nullif(trim(c.name), ''), 'Campaign') AS cname,
      (
        SELECT count(*)::int FROM public.leads l
        WHERE l.campaign_id = c.id
          AND (p_start_date IS NULL OR l.created_at >= p_start_date)
          AND (p_end_date IS NULL OR l.created_at <= p_end_date)
      ) AS ldc,
      (
        SELECT count(DISTINCT v.visitor_hash)::int FROM public.visitors_page_views v
        WHERE v.campaign_id = c.id
          AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
          AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
      ) AS vdc,
      (
        SELECT count(*)::int FROM public.leads l
        WHERE l.campaign_id = c.id
          AND (p_start_date IS NULL OR l.created_at >= p_start_date)
          AND (p_end_date IS NULL OR l.created_at <= p_end_date)
      ) * 10
      + (
        SELECT count(DISTINCT v.visitor_hash)::int FROM public.visitors_page_views v
        WHERE v.campaign_id = c.id
          AND (p_start_date IS NULL OR v.viewed_at >= p_start_date)
          AND (p_end_date IS NULL OR v.viewed_at <= p_end_date)
      ) AS sc
    FROM public.campaigns c
    WHERE c.deleted_at IS NULL
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.org_members om
          WHERE om.org_id = c.org_id AND om.user_id = auth.uid()
        )
      )
    ORDER BY sc DESC NULLS LAST
    LIMIT coalesce(nullif(p_limit, 0), 8)
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_campaign_leaderboard(timestamp with time zone, timestamp with time zone, int) TO authenticated;
