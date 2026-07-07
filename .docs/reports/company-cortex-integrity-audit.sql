-- Read-only Company Cortex integrity report.
-- Reports legacy durable objects that are missing the reviewed-signal lineage
-- required for new writes. Do not use this query to auto-repair rows.

SELECT
  count(*) FILTER (WHERE cardinality(source_signal_ids) = 0) AS objects_missing_source_signals,
  count(*) FILTER (
    WHERE jsonb_typeof(evidence_refs) <> 'array'
      OR jsonb_array_length(evidence_refs) = 0
  ) AS objects_missing_evidence_refs,
  count(*) FILTER (
    WHERE jsonb_typeof(retrieval_rule) <> 'object'
      OR length(btrim(coalesce(retrieval_rule ->> 'trigger', ''))) = 0
      OR length(btrim(coalesce(retrieval_rule ->> 'context_form', ''))) = 0
  ) AS objects_missing_retrieval_rule,
  count(*) AS total_objects
FROM public.company_cortex_objects;

SELECT
  id,
  org_id,
  brain_id,
  object_type,
  status,
  created_at,
  updated_at,
  cardinality(source_signal_ids) AS source_signal_count,
  CASE
    WHEN jsonb_typeof(evidence_refs) = 'array' THEN jsonb_array_length(evidence_refs)
    ELSE 0
  END AS evidence_ref_count,
  length(btrim(coalesce(retrieval_rule ->> 'trigger', ''))) > 0 AS has_retrieval_trigger,
  length(btrim(coalesce(retrieval_rule ->> 'context_form', ''))) > 0 AS has_retrieval_context_form
FROM public.company_cortex_objects
WHERE cardinality(source_signal_ids) = 0
  OR jsonb_typeof(evidence_refs) <> 'array'
  OR jsonb_array_length(evidence_refs) = 0
  OR jsonb_typeof(retrieval_rule) <> 'object'
  OR length(btrim(coalesce(retrieval_rule ->> 'trigger', ''))) = 0
  OR length(btrim(coalesce(retrieval_rule ->> 'context_form', ''))) = 0
ORDER BY updated_at DESC
LIMIT 200;
