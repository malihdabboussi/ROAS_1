-- Full-brain type breakdowns for Brain legend counts.
-- Avoids deriving legend totals from the graph sample loaded for rendering.

CREATE OR REPLACE FUNCTION public.brain_memory_counts_by_type(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(memory_type, cnt), '{}'::jsonb)
  FROM (
    SELECT COALESCE(memory_type, 'fact') AS memory_type, COUNT(*)::bigint AS cnt
    FROM public.ns_memories
    WHERE brain_id = p_brain_id
    GROUP BY COALESCE(memory_type, 'fact')
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.company_cortex_object_counts_by_type(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(object_type, cnt), '{}'::jsonb)
  FROM (
    SELECT COALESCE(object_type, 'unknown') AS object_type, COUNT(*)::bigint AS cnt
    FROM public.company_cortex_objects
    WHERE brain_id = p_brain_id
      AND status <> 'retired'
    GROUP BY COALESCE(object_type, 'unknown')
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.company_cortex_relation_counts_by_type(p_brain_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(relation_type, cnt), '{}'::jsonb)
  FROM (
    SELECT COALESCE(relation_type, 'related_to') AS relation_type, COUNT(*)::bigint AS cnt
    FROM public.company_cortex_object_edges
    WHERE brain_id = p_brain_id
    GROUP BY COALESCE(relation_type, 'related_to')
  ) t;
$$;
