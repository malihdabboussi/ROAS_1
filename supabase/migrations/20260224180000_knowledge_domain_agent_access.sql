-- Add domain column to campaign_nodes for role-based knowledge scoping
ALTER TABLE campaign_nodes
  ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'general'
    CHECK (domain IN ('strategy', 'marketing', 'finance', 'operations', 'creative', 'general'));

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_domain ON campaign_nodes(domain);

-- Update campaign_match_nodes to accept optional domain filter
CREATE OR REPLACE FUNCTION campaign_match_nodes(
  p_campaign_id UUID,
  p_query_embedding TEXT,
  p_match_count INTEGER DEFAULT 10,
  p_match_threshold NUMERIC DEFAULT 0.6,
  p_domains TEXT[] DEFAULT NULL
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
    AND (p_domains IS NULL OR n.domain = ANY(p_domains))
  ORDER BY n.content_embedding <=> p_query_embedding::vector
  LIMIT p_match_count;
$$;
