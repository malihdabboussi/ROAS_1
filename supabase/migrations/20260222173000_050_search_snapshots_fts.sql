-- 050: Full-text search RPC for snapshot summary mode

CREATE OR REPLACE FUNCTION search_snapshots_fts(
  p_brain_id uuid,
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  core text,
  confidence numeric,
  significance_score numeric,
  tags text[],
  rank real
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    s.name,
    s.type,
    s.core,
    s.confidence,
    s.significance_score,
    s.tags,
    ts_rank_cd(
      to_tsvector('english', coalesce(s.name, '') || ' ' || coalesce(s.core, '') || ' ' || coalesce(s.one_liner, '')),
      websearch_to_tsquery('english', p_query)
    ) AS rank
  FROM ns_snapshots s
  WHERE s.brain_id = p_brain_id
    AND to_tsvector('english', coalesce(s.name, '') || ' ' || coalesce(s.core, '') || ' ' || coalesce(s.one_liner, ''))
      @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
$$;
