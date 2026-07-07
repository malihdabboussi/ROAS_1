ALTER TABLE campaign_nodes
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS canonical_node_id UUID NULL REFERENCES campaign_nodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_kind TEXT NULL CHECK (duplicate_kind IN ('exact', 'semantic', 'partial')),
  ADD COLUMN IF NOT EXISTS novelty_score NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER NULL,
  ADD COLUMN IF NOT EXISTS import_job_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_content_hash
  ON campaign_nodes(campaign_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_canonical
  ON campaign_nodes(campaign_id, canonical_node_id);

CREATE INDEX IF NOT EXISTS idx_campaign_nodes_campaign_node_type_created
  ON campaign_nodes(campaign_id, node_type, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_node_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES campaign_nodes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('mission', 'upload', 'drive', 'dropbox', 'url', 'auto_sync')
  ),
  source_id TEXT NOT NULL DEFAULT '',
  source_uri TEXT NOT NULL DEFAULT '',
  source_title TEXT NOT NULL DEFAULT '',
  chunk_index INTEGER NOT NULL DEFAULT -1,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_node_sources_dedup
  ON campaign_node_sources(campaign_id, node_id, source_type, source_id, source_uri, chunk_index);

CREATE INDEX IF NOT EXISTS idx_campaign_node_sources_campaign_node
  ON campaign_node_sources(campaign_id, node_id);

ALTER TABLE campaign_node_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_node_sources_own ON campaign_node_sources;
CREATE POLICY campaign_node_sources_own ON campaign_node_sources
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
