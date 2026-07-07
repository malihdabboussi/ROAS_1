-- Accurate SK knowledge stats (avoids PostgREST 1000-row cap on row fetches)

CREATE OR REPLACE FUNCTION brain_sk_entry_stats(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      COUNT(*)::bigint AS total_entries,
      COALESCE(AVG(mastery), 0)::double precision AS avg_mastery
    FROM ns_sk_entries
    WHERE brain_id = p_brain_id
  ),
  domains AS (
    SELECT COALESCE(
      jsonb_object_agg(domain, cnt),
      '{}'::jsonb
    ) AS domain_breakdown
    FROM (
      SELECT COALESCE(domain, 'unknown') AS domain, COUNT(*)::bigint AS cnt
      FROM ns_sk_entries
      WHERE brain_id = p_brain_id
      GROUP BY COALESCE(domain, 'unknown')
    ) d
  )
  SELECT jsonb_build_object(
    'totalEntries', (SELECT total_entries FROM totals),
    'avgMastery', (SELECT avg_mastery FROM totals),
    'domainBreakdown', (SELECT domain_breakdown FROM domains)
  );
$$;
