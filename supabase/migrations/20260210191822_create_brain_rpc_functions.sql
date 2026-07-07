
-- Search memories via pgvector cosine similarity
CREATE OR REPLACE FUNCTION public.search_memories(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10,
  filter_memory_type text DEFAULT NULL,
  filter_source_type text DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  min_significance double precision DEFAULT 0.0
)
RETURNS TABLE(
  id uuid, content text, memory_type text, source_type text,
  source_title text, speaker text, significance double precision,
  confidence double precision, tags text[], project_id uuid,
  agent_id uuid, recalled_count integer, created_at timestamptz,
  similarity double precision
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.content, m.memory_type, m.source_type,
    m.source_title, m.speaker, m.significance, m.confidence,
    m.tags, m.project_id, m.agent_id, m.recalled_count,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.embedding IS NOT NULL
    AND m.user_id = auth.uid()
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND (filter_memory_type IS NULL OR m.memory_type = filter_memory_type)
    AND (filter_source_type IS NULL OR m.source_type = filter_source_type)
    AND (filter_project_id IS NULL OR m.project_id = filter_project_id)
    AND (filter_tags IS NULL OR m.tags && filter_tags)
    AND m.significance >= min_significance
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Search neural snapshots via pgvector
CREATE OR REPLACE FUNCTION public.search_neural_snapshots(
  query_embedding text,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid, name text, type text, core text, one_liner text,
  story text, moment text, emotion jsonb, source text,
  trigger_pattern text, method text, steps text, filter text,
  challenge text, break_test text, risks text, proof text,
  confidence double precision, significance_score double precision,
  tags text[], source_type text, source_id text,
  created_at timestamptz, updated_at timestamptz,
  similarity double precision
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ns.id, ns.name, ns.type, ns.core, ns.one_liner,
    ns.story, ns.moment, ns.emotion, ns.source,
    ns.trigger_pattern, ns.method, ns.steps, ns.filter,
    ns.challenge, ns.break_test, ns.risks, ns.proof,
    ns.confidence, ns.significance_score,
    ns.tags, ns.source_type, ns.source_id,
    ns.created_at, ns.updated_at,
    (1 - (ns.embedding <=> query_embedding::vector))::double precision AS similarity
  FROM neural_snapshots ns
  WHERE ns.embedding IS NOT NULL
    AND ns.user_id = auth.uid()
  ORDER BY ns.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- Increment recalled count
CREATE OR REPLACE FUNCTION public.increment_recalled_count(memory_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE memories
  SET recalled_count = recalled_count + 1,
      last_recalled_at = NOW()
  WHERE id = memory_id AND user_id = auth.uid();
END;
$$;

-- Get hub memories (most connected)
CREATE OR REPLACE FUNCTION public.get_hub_memories(limit_count integer DEFAULT 5)
RETURNS TABLE(id uuid, content text, memory_type text, significance double precision, connection_count bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.memory_type, m.significance,
    (SELECT COUNT(*) FROM memory_connections mc
     WHERE mc.source_memory_id = m.id OR mc.target_memory_id = m.id) as connection_count
  FROM memories m
  WHERE m.user_id = auth.uid()
  ORDER BY connection_count DESC, m.significance DESC
  LIMIT limit_count;
END;
$$;
;
