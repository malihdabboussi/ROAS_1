-- ============================================================================
-- 047: Brain Consolidation — NeuralSnap schema into Vibey DB
-- Copies all ns_* table schemas from NeuralSnap Supabase into Vibey.
-- No data migration. Fresh start. RLS enabled on all tables.
-- ============================================================================

-- ─── ns_brains ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_brains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Brain',
  description text,
  snapshot_count integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  color text DEFAULT '#8B85C8',
  icon text DEFAULT 'brain',
  tags text[] DEFAULT '{}',
  agent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_brains_owner ON ns_brains (owner_id);
CREATE INDEX IF NOT EXISTS idx_ns_brains_agent ON ns_brains (agent_id) WHERE agent_id IS NOT NULL;

ALTER TABLE ns_brains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_brains_own" ON ns_brains FOR ALL USING (owner_id = auth.uid());

-- ─── ns_memories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_hash text NOT NULL,
  memory_type text NOT NULL DEFAULT 'fact',
  source_type text NOT NULL DEFAULT 'manual',
  source_id text,
  source_title text,
  speaker text,
  confidence numeric DEFAULT 0.8,
  significance numeric DEFAULT 0.5,
  embedding vector(768),
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  source_emotion text,
  emotional_valence numeric,
  emotional_intensity numeric,
  speaker_intent text,
  recalled_count integer DEFAULT 0,
  last_recalled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_memories_brain ON ns_memories (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_memories_content_hash ON ns_memories (content_hash);
CREATE INDEX IF NOT EXISTS idx_ns_memories_created ON ns_memories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ns_memories_significance ON ns_memories (significance DESC);
CREATE INDEX IF NOT EXISTS idx_ns_memories_type ON ns_memories (memory_type);
CREATE INDEX IF NOT EXISTS idx_ns_memories_embedding ON ns_memories USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

ALTER TABLE ns_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_memories_own" ON ns_memories FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_memory_connections ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_memory_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id uuid NOT NULL REFERENCES ns_memories(id) ON DELETE CASCADE,
  target_memory_id uuid NOT NULL REFERENCES ns_memories(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  strength numeric DEFAULT 0.5,
  created_by text DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_memory_id, target_memory_id, relationship)
);
CREATE INDEX IF NOT EXISTS idx_ns_mem_conn_source ON ns_memory_connections (source_memory_id);
CREATE INDEX IF NOT EXISTS idx_ns_mem_conn_target ON ns_memory_connections (target_memory_id);

ALTER TABLE ns_memory_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_mem_conn_own" ON ns_memory_connections FOR ALL USING (
  source_memory_id IN (SELECT id FROM ns_memories WHERE brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()))
);

-- ─── ns_memory_sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_memory_sessions (
  session_key text PRIMARY KEY,
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  memories_created integer DEFAULT 0,
  last_processed_at timestamptz,
  skipped_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_ms_brain ON ns_memory_sessions (brain_id);

ALTER TABLE ns_memory_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_mem_sessions_own" ON ns_memory_sessions FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_memory_versions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_memory_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES ns_memories(id) ON DELETE CASCADE,
  content_previous text NOT NULL,
  edited_by text DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_mv_memory ON ns_memory_versions (memory_id);

ALTER TABLE ns_memory_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_mem_versions_own" ON ns_memory_versions FOR ALL USING (
  memory_id IN (SELECT id FROM ns_memories WHERE brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()))
);

-- ─── ns_snapshots ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Belief',
  core text NOT NULL,
  one_liner text,
  story text,
  moment text,
  emotion jsonb,
  source text,
  trigger_pattern text,
  method text,
  steps text,
  filter text,
  challenge text,
  break_test text,
  risks text,
  proof text,
  confidence numeric DEFAULT 0.5,
  significance_score numeric DEFAULT 0.5,
  tags text[] DEFAULT '{}',
  source_type text DEFAULT 'manual',
  source_id text,
  embedding vector(768),
  agent_id text,
  session_id text,
  capture_context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_snapshots_brain ON ns_snapshots (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_snapshots_type ON ns_snapshots (type);
CREATE INDEX IF NOT EXISTS idx_ns_snapshots_agent_id ON ns_snapshots (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ns_snapshots_fts ON ns_snapshots USING gin (to_tsvector('english', name || ' ' || core || ' ' || COALESCE(one_liner, '')));

ALTER TABLE ns_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_snapshots_own" ON ns_snapshots FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_snapshot_edges ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_snapshot_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES ns_snapshots(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES ns_snapshots(id) ON DELETE CASCADE,
  edge_type text NOT NULL DEFAULT 'related',
  strength numeric NOT NULL DEFAULT 0.5,
  context text,
  auto_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, edge_type)
);
CREATE INDEX IF NOT EXISTS idx_ns_edges_source ON ns_snapshot_edges (source_id);
CREATE INDEX IF NOT EXISTS idx_ns_edges_target ON ns_snapshot_edges (target_id);
CREATE INDEX IF NOT EXISTS idx_ns_edges_type ON ns_snapshot_edges (edge_type);

ALTER TABLE ns_snapshot_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_edges_own" ON ns_snapshot_edges FOR ALL USING (
  source_id IN (SELECT id FROM ns_snapshots WHERE brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()))
);

-- ─── ns_emotional_responses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_emotional_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES ns_memories(id) ON DELETE CASCADE,
  observer_id text,
  subject_id text NOT NULL,
  emotion text NOT NULL,
  valence numeric,
  intensity numeric,
  context text,
  session_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_er_memory ON ns_emotional_responses (memory_id);
CREATE INDEX IF NOT EXISTS idx_ns_er_subject ON ns_emotional_responses (subject_id);
CREATE INDEX IF NOT EXISTS idx_ns_er_created ON ns_emotional_responses (created_at DESC);

ALTER TABLE ns_emotional_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_er_own" ON ns_emotional_responses FOR ALL USING (
  memory_id IN (SELECT id FROM ns_memories WHERE brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()))
);

-- ─── ns_belief_patterns ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_belief_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id text NOT NULL,
  pattern_name text NOT NULL,
  description text,
  emotional_signature jsonb DEFAULT '{}',
  supporting_memories uuid[] DEFAULT '{}',
  supporting_responses uuid[] DEFAULT '{}',
  strength numeric DEFAULT 0.1,
  status text DEFAULT 'emerging',
  detected_at timestamptz DEFAULT now(),
  last_reinforced_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_bp_subject ON ns_belief_patterns (subject_id);
CREATE INDEX IF NOT EXISTS idx_ns_bp_status ON ns_belief_patterns (status);

ALTER TABLE ns_belief_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_bp_own" ON ns_belief_patterns FOR ALL USING (subject_id = auth.uid()::text);

-- ─── ns_perspectives ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id text NOT NULL,
  name text NOT NULL,
  description text,
  beliefs uuid[] DEFAULT '{}',
  influence_areas text[] DEFAULT '{}',
  strength numeric DEFAULT 0.1,
  status text DEFAULT 'emerging',
  blind_spots text,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_persp_subject ON ns_perspectives (subject_id);

ALTER TABLE ns_perspectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_persp_own" ON ns_perspectives FOR ALL USING (subject_id = auth.uid()::text);

-- ─── ns_sk_sources ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_sk_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  title text NOT NULL,
  author text,
  url text,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  entries_count integer DEFAULT 0,
  domain text,
  tags text[] DEFAULT '{}',
  ingested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_sk_sources_brain ON ns_sk_sources (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_sources_domain ON ns_sk_sources (domain);
CREATE INDEX IF NOT EXISTS idx_ns_sk_sources_status ON ns_sk_sources (status);
CREATE INDEX IF NOT EXISTS idx_ns_sk_sources_type ON ns_sk_sources (source_type);

ALTER TABLE ns_sk_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_sk_sources_own" ON ns_sk_sources FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_sk_entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_sk_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES ns_sk_sources(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  domain text,
  complexity text DEFAULT 'foundational',
  prerequisites uuid[] DEFAULT '{}',
  confidence numeric DEFAULT 0.8,
  mastery numeric DEFAULT 0.3,
  recall_count integer DEFAULT 0,
  last_recalled_at timestamptz,
  embedding vector(768),
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_brain ON ns_sk_entries (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_source ON ns_sk_entries (source_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_domain ON ns_sk_entries (domain);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_type ON ns_sk_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_mastery ON ns_sk_entries (mastery DESC);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_hash ON ns_sk_entries (content_hash);
CREATE INDEX IF NOT EXISTS idx_ns_sk_entries_embedding ON ns_sk_entries USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

ALTER TABLE ns_sk_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_sk_entries_own" ON ns_sk_entries FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_sk_gaps ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_sk_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  domain text,
  description text NOT NULL,
  detected_from text NOT NULL,
  severity text NOT NULL DEFAULT 'important',
  suggested_sources jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'open',
  filled_by uuid REFERENCES ns_sk_sources(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ns_sk_gaps_brain ON ns_sk_gaps (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_gaps_domain ON ns_sk_gaps (domain);
CREATE INDEX IF NOT EXISTS idx_ns_sk_gaps_status ON ns_sk_gaps (status);

ALTER TABLE ns_sk_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_sk_gaps_own" ON ns_sk_gaps FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_sk_evolution ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_sk_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES ns_sk_entries(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  previous_content text,
  new_content text,
  reason text,
  source_id uuid REFERENCES ns_sk_sources(id),
  mastery_delta numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_sk_evolution_entry ON ns_sk_evolution (entry_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_evolution_type ON ns_sk_evolution (event_type);
CREATE INDEX IF NOT EXISTS idx_ns_sk_evolution_created ON ns_sk_evolution (created_at DESC);

ALTER TABLE ns_sk_evolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_sk_evolution_own" ON ns_sk_evolution FOR ALL USING (
  entry_id IN (SELECT id FROM ns_sk_entries WHERE brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()))
);

-- ─── ns_sk_curriculum ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_sk_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  description text,
  source_ids uuid[] DEFAULT '{}',
  progress numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_sk_curriculum_brain ON ns_sk_curriculum (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_sk_curriculum_domain ON ns_sk_curriculum (domain);

ALTER TABLE ns_sk_curriculum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_sk_curriculum_own" ON ns_sk_curriculum FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_pending_captures ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_pending_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  snapshots jsonb NOT NULL,
  embeddings jsonb,
  agent_id text,
  session_id text,
  context text,
  source_type text DEFAULT 'openclaw',
  status text DEFAULT 'pending',
  auto_accept_at timestamptz,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_pending_profile_status ON ns_pending_captures (profile_id, status);

ALTER TABLE ns_pending_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_pending_own" ON ns_pending_captures FOR ALL USING (profile_id = auth.uid());

-- ─── ns_connections ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  credentials jsonb,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_connections_profile ON ns_connections (profile_id);

ALTER TABLE ns_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_connections_own" ON ns_connections FOR ALL USING (profile_id = auth.uid());

-- ─── ns_meeting_imports ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_meeting_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES ns_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  meeting_date timestamptz,
  duration_minutes integer,
  participants text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'imported',
  snapshot_count integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  error_message text,
  raw_text_length integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_ns_meeting_imports_profile ON ns_meeting_imports (profile_id);
CREATE INDEX IF NOT EXISTS idx_ns_meeting_imports_connection ON ns_meeting_imports (connection_id);

ALTER TABLE ns_meeting_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_meeting_imports_own" ON ns_meeting_imports FOR ALL USING (profile_id = auth.uid());

-- ─── ns_content_hashes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_content_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  source_type text,
  snapshot_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brain_id, content_hash)
);
CREATE INDEX IF NOT EXISTS idx_ns_content_hashes_brain ON ns_content_hashes (brain_id);

ALTER TABLE ns_content_hashes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_content_hashes_own" ON ns_content_hashes FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- ─── ns_search_feedback ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_search_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  snapshot_id uuid NOT NULL REFERENCES ns_snapshots(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  search_mode text,
  position integer,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_feedback_profile ON ns_search_feedback (profile_id);
CREATE INDEX IF NOT EXISTS idx_ns_feedback_snapshot ON ns_search_feedback (snapshot_id);

ALTER TABLE ns_search_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_search_feedback_own" ON ns_search_feedback FOR ALL USING (profile_id = auth.uid());

-- ─── ns_errors ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  feature text NOT NULL,
  code text NOT NULL,
  message text NOT NULL,
  context jsonb,
  severity text DEFAULT 'error',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_errors_feature ON ns_errors (feature);
CREATE INDEX IF NOT EXISTS idx_ns_errors_created ON ns_errors (created_at DESC);

ALTER TABLE ns_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_errors_service" ON ns_errors FOR ALL USING (true);

-- ─── ns_jobs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  title text NOT NULL,
  source_type text,
  source_id text,
  result jsonb DEFAULT '{}',
  error_message text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_jobs_profile ON ns_jobs (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ns_jobs_status ON ns_jobs (profile_id, status);

ALTER TABLE ns_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_jobs_own" ON ns_jobs FOR ALL USING (profile_id = auth.uid());

-- ─── ns_usage (brain-specific, separate from ai_usage_events) ───────────────
CREATE TABLE IF NOT EXISTS ns_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  source_type text,
  snapshot_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_usage_profile ON ns_usage (profile_id);
CREATE INDEX IF NOT EXISTS idx_ns_usage_created ON ns_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_ns_usage_profile_month ON ns_usage (profile_id, created_at);

ALTER TABLE ns_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_usage_own" ON ns_usage FOR ALL USING (profile_id = auth.uid());

-- ─── ns_api_usage ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ns_api_usage_profile ON ns_api_usage (profile_id);
CREATE INDEX IF NOT EXISTS idx_ns_api_usage_created ON ns_api_usage (created_at);

ALTER TABLE ns_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ns_api_usage_own" ON ns_api_usage FOR ALL USING (profile_id = auth.uid());

-- ============================================================================
-- RPC Functions
-- ============================================================================

-- Semantic search across memories
CREATE OR REPLACE FUNCTION search_ns_memories(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric DEFAULT 0.5,
  p_match_count integer DEFAULT 10,
  p_min_significance numeric DEFAULT 0
)
RETURNS TABLE(
  id uuid, content text, memory_type text, source_type text,
  source_title text, speaker text, significance numeric,
  confidence numeric, tags text[], source_emotion text,
  emotional_valence numeric, emotional_intensity numeric,
  similarity numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id, m.content, m.memory_type, m.source_type,
    m.source_title, m.speaker, m.significance,
    m.confidence, m.tags, m.source_emotion,
    m.emotional_valence, m.emotional_intensity,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM ns_memories m
  WHERE m.brain_id = p_brain_id
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> p_query_embedding)) >= p_match_threshold
    AND m.significance >= p_min_significance
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- Find similar snapshots by embedding
CREATE OR REPLACE FUNCTION find_similar_snapshots(
  p_embedding vector,
  p_brain_id uuid,
  p_exclude_ids uuid[],
  p_limit integer DEFAULT 20
)
RETURNS TABLE(id uuid, similarity double precision)
LANGUAGE sql STABLE
AS $$
  SELECT s.id, 1 - (s.embedding <=> p_embedding) as similarity
  FROM ns_snapshots s
  WHERE s.brain_id = p_brain_id
    AND s.embedding IS NOT NULL
    AND s.id != ALL(p_exclude_ids)
  ORDER BY s.embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- Graph traversal for multi-mode search
CREATE OR REPLACE FUNCTION traverse_edges(
  p_snapshot_ids uuid[],
  p_max_depth integer DEFAULT 2,
  p_min_strength numeric DEFAULT 0.3
)
RETURNS TABLE(
  snapshot_id uuid, reached_from uuid, edge_type text,
  strength numeric, depth integer
)
LANGUAGE sql STABLE
AS $$
WITH RECURSIVE traversal AS (
  SELECT
    CASE WHEN e.source_id = ANY(p_snapshot_ids) THEN e.target_id ELSE e.source_id END as snapshot_id,
    CASE WHEN e.source_id = ANY(p_snapshot_ids) THEN e.source_id ELSE e.target_id END as reached_from,
    e.edge_type,
    e.strength,
    1 as depth
  FROM ns_snapshot_edges e
  WHERE (e.source_id = ANY(p_snapshot_ids) OR e.target_id = ANY(p_snapshot_ids))
    AND e.strength >= p_min_strength
    AND NOT (e.source_id = ANY(p_snapshot_ids) AND e.target_id = ANY(p_snapshot_ids))

  UNION

  SELECT
    CASE WHEN e.source_id = t.snapshot_id THEN e.target_id ELSE e.source_id END,
    t.snapshot_id,
    e.edge_type,
    e.strength,
    t.depth + 1
  FROM ns_snapshot_edges e
  JOIN traversal t ON (e.source_id = t.snapshot_id OR e.target_id = t.snapshot_id)
  WHERE t.depth < p_max_depth
    AND e.strength >= p_min_strength
    AND CASE WHEN e.source_id = t.snapshot_id THEN e.target_id ELSE e.source_id END != ALL(p_snapshot_ids)
    AND CASE WHEN e.source_id = t.snapshot_id THEN e.target_id ELSE e.source_id END != t.reached_from
)
SELECT DISTINCT ON (traversal.snapshot_id) traversal.* FROM traversal
ORDER BY traversal.snapshot_id, traversal.depth, traversal.strength DESC;
$$;

-- Semantic search across SK entries
CREATE OR REPLACE FUNCTION search_sk_entries(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric DEFAULT 0.5,
  p_match_count integer DEFAULT 10,
  p_domain text DEFAULT NULL,
  p_min_mastery numeric DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, content text, entry_type text,
  domain text, complexity text, confidence numeric,
  mastery numeric, recall_count integer, tags text[],
  source_id uuid, similarity numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id, e.title, e.content, e.entry_type,
    e.domain, e.complexity, e.confidence,
    e.mastery, e.recall_count, e.tags,
    e.source_id,
    1 - (e.embedding <=> p_query_embedding) AS similarity
  FROM ns_sk_entries e
  WHERE e.brain_id = p_brain_id
    AND e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> p_query_embedding)) >= p_match_threshold
    AND e.mastery >= p_min_mastery
    AND (p_domain IS NULL OR e.domain = p_domain)
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- Match snapshots by owner (for cross-brain search)
CREATE OR REPLACE FUNCTION match_snapshots(
  query_embedding text,
  match_count integer DEFAULT 10,
  owner_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name text, type text, core text, one_liner text,
  confidence numeric, significance_score numeric, tags text[],
  source_type text, created_at timestamptz, similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.type, s.core, s.one_liner,
    s.confidence, s.significance_score, s.tags,
    s.source_type, s.created_at,
    1 - (s.embedding <=> query_embedding::vector) as similarity
  FROM ns_snapshots s
  JOIN ns_brains b ON s.brain_id = b.id
  WHERE b.owner_id = match_snapshots.owner_id
    AND s.embedding IS NOT NULL
  ORDER BY s.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Billing: addon_products + user_addons tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price_amount integer NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  stripe_price_id text,
  stripe_test_price_id text,
  stripe_product_id text,
  stripe_test_product_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO addon_products (slug, name, price_amount)
VALUES ('agent-brain', 'Agent Brain', 1000)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_slug text NOT NULL,
  stripe_subscription_item_id text,
  brain_id uuid REFERENCES ns_brains(id) ON DELETE SET NULL,
  agent_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  canceled_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_addons_user ON user_addons (user_id);
CREATE INDEX IF NOT EXISTS idx_user_addons_agent ON user_addons (agent_id);

ALTER TABLE user_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_addons_own" ON user_addons FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- Plan columns for brain features
-- ============================================================================

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS included_brains integer DEFAULT 0;

-- Free = 0 brains (no brain on free), Basic = 1, Pro = 1, Ultra = 1
UPDATE subscription_plans SET included_brains = 0 WHERE slug = 'free';
UPDATE subscription_plans SET included_brains = 1 WHERE name = 'Basic';
UPDATE subscription_plans SET included_brains = 1 WHERE name = 'Pro';
UPDATE subscription_plans SET included_brains = 1 WHERE name = 'Ultra';

-- Agent brain access toggle on agent_configs
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS user_brain_access boolean DEFAULT false;
