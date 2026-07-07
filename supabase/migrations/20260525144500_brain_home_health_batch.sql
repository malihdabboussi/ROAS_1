-- Batch health payload for Brain Home cards.
-- Replaces one /brain/health request per card with one RPC over all visible brain ids.

CREATE OR REPLACE FUNCTION public.brain_home_health_batch(
  p_brain_ids uuid[],
  p_owner_id uuid
)
RETURNS TABLE (
  brain_id uuid,
  total_memories bigint,
  total_connections bigint,
  embedding_queue bigint,
  last_capture timestamptz,
  connections_by_type jsonb,
  memory_counts_by_type jsonb,
  sk_entries_by_type jsonb,
  experience_sources bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH requested AS (
    SELECT DISTINCT UNNEST(COALESCE(p_brain_ids, ARRAY[]::uuid[])) AS brain_id
  ),
  accessible AS (
    SELECT b.id AS brain_id, b.scope
    FROM public.ns_brains b
    INNER JOIN requested r ON r.brain_id = b.id
    WHERE public.can_access_brain(b.id, 'view')
  ),
  memory_counts AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_memories
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY brain_id
  ),
  sk_counts AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_sk_entries
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY brain_id
  ),
  memory_connections AS (
    SELECT s.brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_memory_connections c
    INNER JOIN public.ns_memories s ON s.id = c.source_memory_id
    INNER JOIN public.ns_memories t ON t.id = c.target_memory_id AND t.brain_id = s.brain_id
    WHERE s.brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY s.brain_id
  ),
  sk_connections AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_sk_entries
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      AND source_id IS NOT NULL
    GROUP BY brain_id
  ),
  memory_embedding_queue AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_memories
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      AND embedding IS NULL
      AND created_at >= now() - interval '1 hour'
    GROUP BY brain_id
  ),
  sk_embedding_queue AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_sk_entries
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      AND embedding IS NULL
      AND created_at >= now() - interval '1 hour'
    GROUP BY brain_id
  ),
  pending_jobs AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.brain_import_jobs
    WHERE user_id = p_owner_id
      AND status IN ('queued', 'processing', 'retry')
  ),
  last_memory AS (
    SELECT brain_id, MAX(created_at) AS ts
    FROM public.ns_memories
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY brain_id
  ),
  last_sk AS (
    SELECT brain_id, MAX(created_at) AS ts
    FROM public.ns_sk_entries
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY brain_id
  ),
  memory_counts_by_type AS (
    SELECT brain_id, jsonb_object_agg(memory_type, cnt) AS counts
    FROM (
      SELECT brain_id, COALESCE(memory_type, 'unknown') AS memory_type, COUNT(*)::bigint AS cnt
      FROM public.ns_memories
      WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      GROUP BY brain_id, COALESCE(memory_type, 'unknown')
    ) t
    GROUP BY brain_id
  ),
  sk_counts_by_type AS (
    SELECT brain_id, jsonb_object_agg(entry_type, cnt) AS counts
    FROM (
      SELECT brain_id, COALESCE(entry_type, 'unknown') AS entry_type, COUNT(*)::bigint AS cnt
      FROM public.ns_sk_entries
      WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      GROUP BY brain_id, COALESCE(entry_type, 'unknown')
    ) t
    GROUP BY brain_id
  ),
  memory_connections_by_type AS (
    SELECT brain_id, jsonb_object_agg(relationship, cnt) AS counts
    FROM (
      SELECT s.brain_id, COALESCE(c.relationship, 'related_to') AS relationship, COUNT(*)::bigint AS cnt
      FROM public.ns_memory_connections c
      INNER JOIN public.ns_memories s ON s.id = c.source_memory_id
      INNER JOIN public.ns_memories t ON t.id = c.target_memory_id AND t.brain_id = s.brain_id
      WHERE s.brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
      GROUP BY s.brain_id, COALESCE(c.relationship, 'related_to')
    ) t
    GROUP BY brain_id
  ),
  experience_sources AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.ns_sk_sources
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope <> 'company')
    GROUP BY brain_id
  ),
  company_objects AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.company_cortex_objects
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope = 'company')
      AND status <> 'retired'
    GROUP BY brain_id
  ),
  company_signals AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.company_cortex_signals
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope = 'company')
      AND status IN ('proposed', 'active', 'merged')
    GROUP BY brain_id
  ),
  company_edges AS (
    SELECT brain_id, COUNT(*)::bigint AS cnt
    FROM public.company_cortex_object_edges
    WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope = 'company')
    GROUP BY brain_id
  ),
  company_object_counts_by_type AS (
    SELECT brain_id, jsonb_object_agg(object_type, cnt) AS counts
    FROM (
      SELECT brain_id, COALESCE(object_type, 'unknown') AS object_type, COUNT(*)::bigint AS cnt
      FROM public.company_cortex_objects
      WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope = 'company')
        AND status <> 'retired'
      GROUP BY brain_id, COALESCE(object_type, 'unknown')
    ) t
    GROUP BY brain_id
  ),
  company_relation_counts_by_type AS (
    SELECT brain_id, jsonb_object_agg(relation_type, cnt) AS counts
    FROM (
      SELECT brain_id, COALESCE(relation_type, 'related_to') AS relation_type, COUNT(*)::bigint AS cnt
      FROM public.company_cortex_object_edges
      WHERE brain_id IN (SELECT brain_id FROM accessible WHERE scope = 'company')
      GROUP BY brain_id, COALESCE(relation_type, 'related_to')
    ) t
    GROUP BY brain_id
  )
  SELECT
    a.brain_id,
    CASE
      WHEN a.scope = 'company' THEN COALESCE(co.cnt, 0)
      ELSE COALESCE(mc.cnt, 0) + COALESCE(sc.cnt, 0)
    END AS total_memories,
    CASE
      WHEN a.scope = 'company' THEN COALESCE(ce.cnt, 0)
      ELSE COALESCE(mconn.cnt, 0) + COALESCE(skconn.cnt, 0)
    END AS total_connections,
    CASE
      WHEN a.scope = 'company' THEN 0
      ELSE COALESCE(meq.cnt, 0) + COALESCE(seq.cnt, 0) + COALESCE((SELECT cnt FROM pending_jobs), 0)
    END AS embedding_queue,
    CASE
      WHEN a.scope = 'company' THEN NULL::timestamptz
      ELSE COALESCE(GREATEST(lm.ts, lsk.ts), lm.ts, lsk.ts)
    END AS last_capture,
    CASE
      WHEN a.scope = 'company' THEN COALESCE(crct.counts, '{}'::jsonb)
      ELSE COALESCE(mcbt.counts, '{}'::jsonb)
    END AS connections_by_type,
    CASE
      WHEN a.scope = 'company' THEN COALESCE(coct.counts, '{}'::jsonb)
      ELSE COALESCE(mct.counts, '{}'::jsonb)
    END AS memory_counts_by_type,
    CASE
      WHEN a.scope = 'company' THEN '{}'::jsonb
      ELSE COALESCE(sct.counts, '{}'::jsonb)
    END AS sk_entries_by_type,
    CASE
      WHEN a.scope = 'company' THEN COALESCE(cs.cnt, 0)
      ELSE COALESCE(es.cnt, 0)
    END AS experience_sources
  FROM accessible a
  LEFT JOIN memory_counts mc ON mc.brain_id = a.brain_id
  LEFT JOIN sk_counts sc ON sc.brain_id = a.brain_id
  LEFT JOIN memory_connections mconn ON mconn.brain_id = a.brain_id
  LEFT JOIN sk_connections skconn ON skconn.brain_id = a.brain_id
  LEFT JOIN memory_embedding_queue meq ON meq.brain_id = a.brain_id
  LEFT JOIN sk_embedding_queue seq ON seq.brain_id = a.brain_id
  LEFT JOIN last_memory lm ON lm.brain_id = a.brain_id
  LEFT JOIN last_sk lsk ON lsk.brain_id = a.brain_id
  LEFT JOIN memory_counts_by_type mct ON mct.brain_id = a.brain_id
  LEFT JOIN sk_counts_by_type sct ON sct.brain_id = a.brain_id
  LEFT JOIN memory_connections_by_type mcbt ON mcbt.brain_id = a.brain_id
  LEFT JOIN experience_sources es ON es.brain_id = a.brain_id
  LEFT JOIN company_objects co ON co.brain_id = a.brain_id
  LEFT JOIN company_signals cs ON cs.brain_id = a.brain_id
  LEFT JOIN company_edges ce ON ce.brain_id = a.brain_id
  LEFT JOIN company_object_counts_by_type coct ON coct.brain_id = a.brain_id
  LEFT JOIN company_relation_counts_by_type crct ON crct.brain_id = a.brain_id;
$$;
