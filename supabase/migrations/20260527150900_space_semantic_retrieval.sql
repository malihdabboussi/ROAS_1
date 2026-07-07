-- Space Retrieval MVP: separate semantic object/chunk index for Space assets.
-- This does not use Brain storage. Source tables remain canonical.

CREATE TABLE IF NOT EXISTS public.space_semantic_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('personal', 'org')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  campaign_id uuid,
  source_type text NOT NULL,
  source_id text NOT NULL,
  parent_type text,
  parent_id text,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL,
  source_updated_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.space_semantic_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_object_id uuid NOT NULL REFERENCES public.space_semantic_objects(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('personal', 'org')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  campaign_id uuid,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_title text,
  chunk_index integer NOT NULL,
  title text NOT NULL DEFAULT '',
  contextual_prefix text NOT NULL DEFAULT '',
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL,
  source_updated_at timestamptz,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(contextual_prefix, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_space_semantic_objects_scope
  ON public.space_semantic_objects (scope_type, user_id, org_id, space_id);

CREATE INDEX IF NOT EXISTS idx_space_semantic_objects_source
  ON public.space_semantic_objects (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_space_semantic_chunks_object
  ON public.space_semantic_chunks (space_object_id);

CREATE INDEX IF NOT EXISTS idx_space_semantic_chunks_scope
  ON public.space_semantic_chunks (scope_type, user_id, org_id, space_id);

CREATE INDEX IF NOT EXISTS idx_space_semantic_chunks_source
  ON public.space_semantic_chunks (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_space_semantic_chunks_embedding
  ON public.space_semantic_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_chunks_search_vector
  ON public.space_semantic_chunks USING gin (search_vector);

ALTER TABLE public.space_semantic_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_semantic_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_semantic_objects_select ON public.space_semantic_objects;
CREATE POLICY space_semantic_objects_select
  ON public.space_semantic_objects FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (org_id IS NOT NULL AND is_org_member(org_id) AND EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = space_semantic_objects.space_id
        AND s.visibility = 'team'
        AND s.org_id = space_semantic_objects.org_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.space_shares ss
      WHERE ss.space_id = space_semantic_objects.space_id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND space_semantic_objects.org_id IS NOT NULL
            AND ss.entity_id = space_semantic_objects.org_id
            AND is_org_member(space_semantic_objects.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS space_semantic_objects_write ON public.space_semantic_objects;
CREATE POLICY space_semantic_objects_write
  ON public.space_semantic_objects FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_semantic_objects.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_semantic_objects.org_id
      )
    )
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_semantic_objects.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_semantic_objects.org_id
      )
    )
  );

DROP POLICY IF EXISTS space_semantic_chunks_select ON public.space_semantic_chunks;
CREATE POLICY space_semantic_chunks_select
  ON public.space_semantic_chunks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_semantic_objects o
      WHERE o.id = space_semantic_chunks.space_object_id
    )
  );

DROP POLICY IF EXISTS space_semantic_chunks_write ON public.space_semantic_chunks;
CREATE POLICY space_semantic_chunks_write
  ON public.space_semantic_chunks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_semantic_objects o
      WHERE o.id = space_semantic_chunks.space_object_id
        AND (
          auth.uid() = o.user_id
          OR (o.org_id IS NOT NULL AND has_space_write_access(o.space_id, o.org_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.space_semantic_objects o
      WHERE o.id = space_semantic_chunks.space_object_id
        AND (
          auth.uid() = o.user_id
          OR (o.org_id IS NOT NULL AND has_space_write_access(o.space_id, o.org_id))
        )
    )
  );

DROP POLICY IF EXISTS space_semantic_objects_service_all ON public.space_semantic_objects;
CREATE POLICY space_semantic_objects_service_all
  ON public.space_semantic_objects FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS space_semantic_chunks_service_all ON public.space_semantic_chunks;
CREATE POLICY space_semantic_chunks_service_all
  ON public.space_semantic_chunks FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.search_space_semantic_chunks(
  p_query_embedding vector,
  p_match_threshold numeric DEFAULT 0.25,
  p_match_count integer DEFAULT 20,
  p_space_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_source_types text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  space_object_id uuid,
  scope_type text,
  user_id uuid,
  org_id uuid,
  space_id uuid,
  campaign_id uuid,
  source_type text,
  source_id text,
  source_title text,
  chunk_index integer,
  title text,
  contextual_prefix text,
  content text,
  metadata jsonb,
  similarity numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
  SELECT
    c.id,
    c.space_object_id,
    c.scope_type,
    c.user_id,
    c.org_id,
    c.space_id,
    c.campaign_id,
    c.source_type,
    c.source_id,
    c.source_title,
    c.chunk_index,
    c.title,
    c.contextual_prefix,
    c.content,
    c.metadata,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.space_semantic_chunks c
  WHERE c.embedding IS NOT NULL
    AND (p_space_id IS NULL OR c.space_id = p_space_id)
    AND (p_campaign_id IS NULL OR c.campaign_id = p_campaign_id)
    AND (p_source_types IS NULL OR c.source_type = ANY(p_source_types))
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT least(greatest(coalesce(p_match_count, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_space_semantic_chunks(
  vector,
  numeric,
  integer,
  uuid,
  uuid,
  text[]
) TO authenticated, service_role;
