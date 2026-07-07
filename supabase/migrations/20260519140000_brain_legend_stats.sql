-- Accurate brain connection / legend counts (avoids PostgREST 1000-row cap on RPC rows)

CREATE OR REPLACE FUNCTION count_brain_memory_connections(p_brain_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM ns_memory_connections c
  INNER JOIN ns_memories s ON s.id = c.source_memory_id AND s.brain_id = p_brain_id
  INNER JOIN ns_memories t ON t.id = c.target_memory_id AND t.brain_id = p_brain_id;
$$;

CREATE OR REPLACE FUNCTION brain_sk_entry_counts_by_type(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(entry_type, cnt),
    '{}'::jsonb
  )
  FROM (
    SELECT entry_type, COUNT(*)::bigint AS cnt
    FROM ns_sk_entries
    WHERE brain_id = p_brain_id
    GROUP BY entry_type
  ) t;
$$;

CREATE OR REPLACE FUNCTION brain_legend_connection_counts(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH mem_edges AS (
    SELECT c.relationship, COUNT(*)::bigint AS cnt
    FROM ns_memory_connections c
    INNER JOIN ns_memories s ON s.id = c.source_memory_id AND s.brain_id = p_brain_id
    INNER JOIN ns_memories t ON t.id = c.target_memory_id AND t.brain_id = p_brain_id
    GROUP BY c.relationship
  ),
  sk_emerged AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM ns_sk_entries e
    WHERE e.brain_id = p_brain_id AND e.source_id IS NOT NULL
  ),
  exp_emerged AS (
    SELECT COALESCE(SUM(mem_count), 0)::bigint AS cnt
    FROM (
      SELECT COUNT(*)::bigint AS mem_count
      FROM ns_memories m
      WHERE m.brain_id = p_brain_id
        AND (m.source_id IS NOT NULL OR m.source_title IS NOT NULL)
      GROUP BY
        COALESCE(m.source_id::text, ''),
        COALESCE(m.source_type, ''),
        COALESCE(m.source_title, '')
      HAVING COUNT(*) >= 2
    ) g
  ),
  mem_json AS (
    SELECT COALESCE(jsonb_object_agg(relationship, cnt), '{}'::jsonb) AS j
    FROM mem_edges
  )
  SELECT mem_json.j
    || jsonb_build_object(
      'emerged_from',
      COALESCE((SELECT cnt FROM sk_emerged), 0) + COALESCE((SELECT cnt FROM exp_emerged), 0)
    )
  FROM mem_json;
$$;

CREATE OR REPLACE FUNCTION count_brain_experience_sources(p_brain_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*)::bigint FROM ns_sk_sources WHERE brain_id = p_brain_id)
    +
    (
      SELECT COUNT(*)::bigint
      FROM (
        SELECT 1
        FROM ns_memories m
        WHERE m.brain_id = p_brain_id
          AND (m.source_id IS NOT NULL OR m.source_title IS NOT NULL)
        GROUP BY
          COALESCE(m.source_id::text, ''),
          COALESCE(m.source_type, ''),
          COALESCE(m.source_title, '')
        HAVING COUNT(*) >= 2
      ) g
    )
  );
$$;

CREATE OR REPLACE FUNCTION find_connections_for_brain(
  p_brain_id uuid,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  source_memory_id uuid,
  target_memory_id uuid,
  relationship text,
  strength numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.id, c.source_memory_id, c.target_memory_id, c.relationship, c.strength, c.created_at
  FROM ns_memory_connections c
  INNER JOIN ns_memories s ON s.id = c.source_memory_id AND s.brain_id = p_brain_id
  INNER JOIN ns_memories t ON t.id = c.target_memory_id AND t.brain_id = p_brain_id
  ORDER BY c.created_at DESC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;
