-- Space Knowledge stats batch v2: roll campaigns up by LIVE space membership.
--
-- The previous version aggregated campaigns by the denormalized
-- space_semantic_objects.campaign_id / space_semantic_edges.campaign_id, which is
-- stamped at index time and goes stale when a space is reassigned to another
-- campaign. The campaign graph endpoint resolves membership via spaces.campaign_id,
-- so the stats must use the same source of truth or Brain-Home counts disagree with
-- the rendered graph.
--
-- Space rollup is unchanged (it was always correct). Campaign rollup now counts the
-- objects/edges of the campaign's CURRENT member spaces, plus campaign-level rows
-- that have no space. SECURITY INVOKER is preserved so the caller's RLS applies.

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
  -- Campaign objects via current space membership, plus campaign-level (space-less)
  -- objects. The two branches are mutually exclusive on space_id, so UNION ALL is safe.
  campaign_member_objects AS (
    SELECT s.campaign_id AS scope_id,
           COALESCE(o.source_type, 'space') AS source_type,
           o.id,
           o.updated_at
    FROM public.space_semantic_objects o
    JOIN public.spaces s ON s.id = o.space_id
    WHERE s.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
    UNION ALL
    SELECT o.campaign_id AS scope_id,
           COALESCE(o.source_type, 'space') AS source_type,
           o.id,
           o.updated_at
    FROM public.space_semantic_objects o
    WHERE o.space_id IS NULL
      AND o.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
  ),
  campaign_type_counts AS (
    SELECT scope_id,
           source_type,
           COUNT(*)::bigint AS cnt,
           MAX(updated_at) AS last_updated
    FROM campaign_member_objects
    GROUP BY scope_id, source_type
  ),
  campaign_stats AS (
    SELECT scope_id,
           SUM(cnt)::bigint AS total_objects,
           MAX(last_updated) AS last_updated,
           jsonb_object_agg(source_type, cnt) AS by_source_type
    FROM campaign_type_counts
    GROUP BY scope_id
  ),
  campaign_member_edges AS (
    SELECT s.campaign_id AS scope_id, e.id
    FROM public.space_semantic_edges e
    JOIN public.spaces s ON s.id = e.space_id
    WHERE s.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
      AND e.deleted_at IS NULL
    UNION ALL
    SELECT e.campaign_id AS scope_id, e.id
    FROM public.space_semantic_edges e
    WHERE e.space_id IS NULL
      AND e.campaign_id = ANY(COALESCE(p_campaign_ids, ARRAY[]::uuid[]))
      AND e.deleted_at IS NULL
  ),
  campaign_edge_counts AS (
    SELECT scope_id, COUNT(DISTINCT id)::bigint AS total_edges
    FROM campaign_member_edges
    GROUP BY scope_id
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
