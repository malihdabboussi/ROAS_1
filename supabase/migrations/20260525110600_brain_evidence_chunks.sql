-- Brain evidence chunks.
-- Stores original source chunks alongside distilled memories for source-grounded retrieval.

CREATE TABLE IF NOT EXISTS public.ns_brain_evidence_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id text,
  source_title text,
  chunk_index integer NOT NULL,
  contextual_prefix text NOT NULL DEFAULT '',
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb NOT NULL DEFAULT '{}',
  content_hash text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(contextual_prefix, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brain_id, source_type, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ns_brain_evidence_chunks_brain
  ON public.ns_brain_evidence_chunks (brain_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ns_brain_evidence_chunks_hash
  ON public.ns_brain_evidence_chunks (content_hash);

CREATE INDEX IF NOT EXISTS idx_ns_brain_evidence_chunks_embedding
  ON public.ns_brain_evidence_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ns_brain_evidence_chunks_search_vector
  ON public.ns_brain_evidence_chunks USING gin (search_vector);

ALTER TABLE public.ns_brain_evidence_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ns_brain_evidence_chunks_access_select ON public.ns_brain_evidence_chunks;
CREATE POLICY ns_brain_evidence_chunks_access_select
  ON public.ns_brain_evidence_chunks FOR SELECT TO authenticated
  USING (public.can_access_brain(brain_id, 'view'));

DROP POLICY IF EXISTS ns_brain_evidence_chunks_train_insert ON public.ns_brain_evidence_chunks;
CREATE POLICY ns_brain_evidence_chunks_train_insert
  ON public.ns_brain_evidence_chunks FOR INSERT TO authenticated
  WITH CHECK (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS ns_brain_evidence_chunks_train_update ON public.ns_brain_evidence_chunks;
CREATE POLICY ns_brain_evidence_chunks_train_update
  ON public.ns_brain_evidence_chunks FOR UPDATE TO authenticated
  USING (public.can_access_brain(brain_id, 'train'))
  WITH CHECK (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS ns_brain_evidence_chunks_train_delete ON public.ns_brain_evidence_chunks;
CREATE POLICY ns_brain_evidence_chunks_train_delete
  ON public.ns_brain_evidence_chunks FOR DELETE TO authenticated
  USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS ns_brain_evidence_chunks_service_all ON public.ns_brain_evidence_chunks;
CREATE POLICY ns_brain_evidence_chunks_service_all
  ON public.ns_brain_evidence_chunks FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
