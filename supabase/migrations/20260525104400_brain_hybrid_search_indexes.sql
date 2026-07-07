-- Brain hybrid retrieval lexical indexes.
-- Adds weighted stored tsvector columns for consistent full-text search across Brain families.

ALTER TABLE public.ns_memories
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ns_memories
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(source_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ns_memories_search_vector
  ON public.ns_memories USING gin (search_vector);

ALTER TABLE public.ns_sk_entries
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ns_sk_entries
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(domain, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_search_vector
  ON public.ns_sk_entries USING gin (search_vector);

ALTER TABLE public.ns_narrative_pages
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ns_narrative_pages
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_md, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ns_narrative_pages_search_vector
  ON public.ns_narrative_pages USING gin (search_vector);

ALTER TABLE public.ns_belief_patterns
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ns_belief_patterns
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(pattern_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ns_belief_patterns_search_vector
  ON public.ns_belief_patterns USING gin (search_vector);

ALTER TABLE public.ns_perspectives
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ns_perspectives
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(narrative_md, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ns_perspectives_search_vector
  ON public.ns_perspectives USING gin (search_vector);

ALTER TABLE public.company_cortex_objects
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.company_cortex_objects
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(truth, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_company_cortex_objects_search_vector
  ON public.company_cortex_objects USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.search_ns_memories_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  brain_id uuid,
  content text,
  memory_type text,
  source_type text,
  source_id text,
  source_title text,
  significance double precision,
  confidence double precision,
  tags text[],
  metadata jsonb,
  lexical_rank bigint,
  lexical_score real
)
LANGUAGE sql
STABLE
AS $$
  WITH query AS (
    SELECT websearch_to_tsquery('english', coalesce(p_query, '')) AS tsquery
  ),
  ranked AS (
    SELECT
      m.id,
      m.brain_id,
      m.content,
      m.memory_type,
      m.source_type,
      m.source_id,
      m.source_title,
      m.significance,
      m.confidence,
      m.tags,
      m.metadata,
      ts_rank_cd(m.search_vector, query.tsquery)::real AS lexical_score
    FROM public.ns_memories m
    CROSS JOIN query
    WHERE m.brain_id = p_brain_id
      AND m.search_vector @@ query.tsquery
  )
  SELECT
    ranked.id,
    ranked.brain_id,
    ranked.content,
    ranked.memory_type,
    ranked.source_type,
    ranked.source_id,
    ranked.source_title,
    ranked.significance,
    ranked.confidence,
    ranked.tags,
    ranked.metadata,
    row_number() OVER (
      ORDER BY ranked.lexical_score DESC, ranked.significance DESC, ranked.confidence DESC
    ) AS lexical_rank,
    ranked.lexical_score
  FROM ranked
  ORDER BY ranked.lexical_score DESC, ranked.significance DESC, ranked.confidence DESC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 50));
$$;
