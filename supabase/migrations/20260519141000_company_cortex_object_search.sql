ALTER TABLE public.company_cortex_objects
  ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_company_cortex_objects_embedding
  ON public.company_cortex_objects
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_company_cortex_objects(
  p_brain_id uuid,
  p_org_id uuid,
  p_query_embedding vector(768),
  p_match_count integer DEFAULT 10,
  p_match_threshold double precision DEFAULT 0.35
)
RETURNS TABLE (
  id uuid,
  object_type text,
  title text,
  truth text,
  status text,
  confidence numeric,
  updated_at timestamptz,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    o.id,
    o.object_type,
    o.title,
    o.truth,
    o.status,
    o.confidence,
    o.updated_at,
    1 - (o.embedding <=> p_query_embedding) AS similarity
  FROM public.company_cortex_objects o
  WHERE o.brain_id = p_brain_id
    AND o.org_id = p_org_id
    AND o.status <> 'retired'
    AND o.embedding IS NOT NULL
    AND 1 - (o.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY o.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 50);
$$;
