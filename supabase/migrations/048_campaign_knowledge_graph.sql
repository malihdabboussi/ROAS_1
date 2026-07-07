-- 048: Campaign Knowledge Graph (Sprint 2.5)
-- Per-campaign graph nodes + typed edges with vector-assisted retrieval.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS campaign_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (
    node_type IN ('deliverable', 'document', 'offer', 'avatar', 'theme', 'agent_learning', 'user_upload', 'url_import')
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_embedding VECTOR(768),
  source_type TEXT NOT NULL DEFAULT 'auto_sync' CHECK (
    source_type IN ('mission', 'upload', 'drive', 'dropbox', 'url', 'auto_sync')
  ),
  source_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_id ON campaign_nodes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_nodes_user_id ON campaign_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_nodes_type ON campaign_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_campaign_nodes_source ON campaign_nodes(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_campaign_nodes_created_at ON campaign_nodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_nodes_embedding
  ON campaign_nodes USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE campaign_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_nodes_own ON campaign_nodes;
CREATE POLICY campaign_nodes_own ON campaign_nodes
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_campaign_nodes ON campaign_nodes;
CREATE TRIGGER set_updated_at_campaign_nodes
  BEFORE UPDATE ON campaign_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS campaign_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES campaign_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES campaign_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (
    edge_type IN ('connected', 'evolved_from', 'contradicts', 'used_by', 'created_by', 'references', 'supersedes')
  ),
  strength NUMERIC NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_node_id, to_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_campaign_edges_campaign_id ON campaign_edges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_edges_user_id ON campaign_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_edges_from_node ON campaign_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_campaign_edges_to_node ON campaign_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_campaign_edges_type ON campaign_edges(edge_type);

ALTER TABLE campaign_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_edges_own ON campaign_edges;
CREATE POLICY campaign_edges_own ON campaign_edges
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION campaign_match_nodes(
  p_campaign_id UUID,
  p_query_embedding TEXT,
  p_match_count INTEGER DEFAULT 10,
  p_match_threshold NUMERIC DEFAULT 0.6
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  node_type TEXT,
  source_type TEXT,
  source_id TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.id,
    n.title,
    n.content,
    n.node_type,
    n.source_type,
    n.source_id,
    n.metadata,
    1 - (n.content_embedding <=> p_query_embedding::vector) AS similarity
  FROM campaign_nodes n
  WHERE n.campaign_id = p_campaign_id
    AND n.content_embedding IS NOT NULL
    AND (1 - (n.content_embedding <=> p_query_embedding::vector)) >= p_match_threshold
  ORDER BY n.content_embedding <=> p_query_embedding::vector
  LIMIT p_match_count;
$$;

CREATE OR REPLACE FUNCTION campaign_traverse_edges(
  p_campaign_id UUID,
  p_seed_node_ids UUID[],
  p_max_depth INTEGER DEFAULT 2,
  p_min_strength NUMERIC DEFAULT 0.3
)
RETURNS TABLE(
  node_id UUID,
  reached_from UUID,
  edge_type TEXT,
  strength NUMERIC,
  depth INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE traversal AS (
  SELECT
    CASE WHEN e.from_node_id = ANY(p_seed_node_ids) THEN e.to_node_id ELSE e.from_node_id END AS node_id,
    CASE WHEN e.from_node_id = ANY(p_seed_node_ids) THEN e.from_node_id ELSE e.to_node_id END AS reached_from,
    e.edge_type,
    e.strength,
    1 AS depth
  FROM campaign_edges e
  WHERE e.campaign_id = p_campaign_id
    AND (e.from_node_id = ANY(p_seed_node_ids) OR e.to_node_id = ANY(p_seed_node_ids))
    AND e.strength >= p_min_strength

  UNION ALL

  SELECT
    CASE WHEN e.from_node_id = t.node_id THEN e.to_node_id ELSE e.from_node_id END AS node_id,
    t.node_id AS reached_from,
    e.edge_type,
    e.strength,
    t.depth + 1 AS depth
  FROM campaign_edges e
  JOIN traversal t ON (e.from_node_id = t.node_id OR e.to_node_id = t.node_id)
  WHERE e.campaign_id = p_campaign_id
    AND t.depth < p_max_depth
    AND e.strength >= p_min_strength
)
SELECT DISTINCT ON (node_id) node_id, reached_from, edge_type, strength, depth
FROM traversal
ORDER BY node_id, depth ASC, strength DESC;
$$;
