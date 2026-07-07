-- Space Knowledge stats batch: SQL aggregates for the Brain Home stats endpoint.
-- Replaces fetching every space_semantic_objects / space_semantic_edges row and
-- counting in API memory (GET /api/space-retrieval/knowledge/stats/batch).
-- SECURITY INVOKER: the caller's RLS on both tables applies exactly as the
-- previous per-row reads did.

CREATE OR REPLACE FUNCTION public.space_knowledge_stats_batch(
  p_space_ids uuid[],
  p_campaign_ids uuid[]
)
RETURNS TABLE (
  scope text,
  scope_id uuid,
  total_objects bigint,
  total_edges bigint,
  last_updated timestamptz,
  by_source_type jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH space_type_counts AS (
    SELECT o.space_id AS scope_id,
           COALESCE(o.source_type, 'space') AS source_type,
           COUNT(*)::bigint AS cnt,
           MAX(o.updated_at) AS last_updated
    FROM public.space_semantic_objects o
    WHERE o.space_id = ANY(COALESCE(p_space_ids, ARRAY[]::uuid[]))
    GROUP BY o.space_id, COALESCE(o.source_type, 'space')
  ),
  space_stats AS (
    SELECT scope_id,
           SUM(cnt)::bigint AS total_objects,
           MAX(last_updated) AS last_updated,
           jsonb_object_agg(source_type, cnt) AS by_source_type
    FROM space_type_counts
    GROUP BY scope_id
  ),
  space_edge_counts AS (
    SELECT e.space_id AS scope_id, COUNT(*)::bigint AS total_edges
    FROM public.space_semantic_edges e
    WHERE e.space_id = ANY(COALESCE(p_space_ids, ARRAY[]::uuid[]))
      AND e.deleted_at IS NULL
    GROUP BY e.space_id
  ),
  campaign_type_counts AS (
    SELECT o.campaign_id AS scope_id,
           COALESCE(o.source_type, 'space') AS source_type,
           COUNT(*)::bigint AS cnt,
           MAX(o.updated_at) AS last_updated
    FROM public.space_semantic_objects o
    WHERE o.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
    GROUP BY o.campaign_id, COALESCE(o.source_type, 'space')
  ),
  campaign_stats AS (
    SELECT scope_id,
           SUM(cnt)::bigint AS total_objects,
           MAX(last_updated) AS last_updated,
           jsonb_object_agg(source_type, cnt) AS by_source_type
    FROM campaign_type_counts
    GROUP BY scope_id
  ),
  campaign_edge_counts AS (
    SELECT e.campaign_id AS scope_id, COUNT(*)::bigint AS total_edges
    FROM public.space_semantic_edges e
    WHERE e.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
      AND e.deleted_at IS NULL
    GROUP BY e.campaign_id
  )
  SELECT 'space'::text AS scope,
         s.scope_id,
         s.total_objects,
         COALESCE(ec.total_edges, 0) AS total_edges,
         s.last_updated,
         s.by_source_type
  FROM space_stats s
  LEFT JOIN space_edge_counts ec ON ec.scope_id = s.scope_id
  UNION ALL
  SELECT 'campaign'::text AS scope,
         c.scope_id,
         c.total_objects,
         COALESCE(cec.total_edges, 0) AS total_edges,
         c.last_updated,
         c.by_source_type
  FROM campaign_stats c
  LEFT JOIN campaign_edge_counts cec ON cec.scope_id = c.scope_id;
$$;

GRANT EXECUTE ON FUNCTION public.space_knowledge_stats_batch(uuid[], uuid[])
  TO authenticated, service_role;
