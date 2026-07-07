
-- Brain memories table (operational — search/remember write here)
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  content_hash text NOT NULL,
  memory_type text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  source_title text,
  project_id uuid,
  agent_id uuid,
  speaker text,
  confidence double precision DEFAULT 0.8,
  significance double precision DEFAULT 0.5,
  embedding vector(768),
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  recalled_count integer DEFAULT 0,
  last_recalled_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(content_hash);
CREATE INDEX IF NOT EXISTS idx_memories_memory_type ON memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_source_type ON memories(source_type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_significance ON memories(significance DESC);

-- Memory connections (graph edges)
CREATE TABLE IF NOT EXISTS memory_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  strength double precision DEFAULT 0.5,
  created_by text DEFAULT 'auto',
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_memory_id, target_memory_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_mc_source ON memory_connections(source_memory_id);
CREATE INDEX IF NOT EXISTS idx_mc_target ON memory_connections(target_memory_id);

-- Memory versions (edit history)
CREATE TABLE IF NOT EXISTS memory_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  content_previous text NOT NULL,
  edited_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mv_memory_id ON memory_versions(memory_id);

-- Memory sessions (conversation processing tracker)
CREATE TABLE IF NOT EXISTS memory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_key text NOT NULL UNIQUE,
  last_message_id text,
  last_processed_at timestamptz DEFAULT now(),
  memories_created integer DEFAULT 0,
  skipped_reason text,
  created_at timestamptz DEFAULT now()
);

-- Neural snapshots (crystallized knowledge)
CREATE TABLE IF NOT EXISTS neural_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  type text NOT NULL,
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
  confidence double precision DEFAULT 0.8,
  significance_score double precision,
  tags text[] DEFAULT '{}',
  source_type text,
  source_id text,
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ns_user_id ON neural_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_ns_type ON neural_snapshots(type);
CREATE INDEX IF NOT EXISTS idx_ns_created_at ON neural_snapshots(created_at DESC);

-- RLS policies
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neural_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories" ON memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own memory connections" ON memory_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM memories WHERE memories.id = memory_connections.source_memory_id AND memories.user_id = auth.uid())
);
CREATE POLICY "Users can manage own memory versions" ON memory_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM memories WHERE memories.id = memory_versions.memory_id AND memories.user_id = auth.uid())
);
CREATE POLICY "Users can manage own memory sessions" ON memory_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own neural snapshots" ON neural_snapshots FOR ALL USING (auth.uid() = user_id);
;
