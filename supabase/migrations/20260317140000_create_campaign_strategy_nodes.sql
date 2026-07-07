CREATE TABLE IF NOT EXISTS campaign_strategy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

  node_type TEXT NOT NULL DEFAULT 'sticky_note'
    CHECK (node_type IN ('sticky_note', 'text_block', 'group_box', 'milestone')),
  text TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  artifact_hint TEXT,
  linked_artifact_id UUID,
  linked_artifact_type TEXT,

  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_strategy_nodes_user_id ON campaign_strategy_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_strategy_nodes_campaign_id ON campaign_strategy_nodes(campaign_id);

ALTER TABLE campaign_strategy_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own strategy nodes" ON campaign_strategy_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy nodes" ON campaign_strategy_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy nodes" ON campaign_strategy_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy nodes" ON campaign_strategy_nodes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access strategy nodes" ON campaign_strategy_nodes FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_campaign_strategy_nodes_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_strategy_nodes_updated_at ON campaign_strategy_nodes;
CREATE TRIGGER campaign_strategy_nodes_updated_at
  BEFORE UPDATE ON campaign_strategy_nodes
  FOR EACH ROW EXECUTE FUNCTION update_campaign_strategy_nodes_timestamp();
