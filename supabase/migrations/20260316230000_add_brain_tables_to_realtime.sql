-- Add brain tables to Supabase realtime publication
-- so the frontend can receive INSERT events as Atlas creates memories/snapshots

ALTER PUBLICATION supabase_realtime ADD TABLE ns_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE ns_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE ns_sk_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_nodes;

-- REPLICA IDENTITY FULL is required for Supabase Realtime filtered subscriptions
-- (filter by brain_id, campaign_id) to include all columns in change payloads
ALTER TABLE ns_memories REPLICA IDENTITY FULL;
ALTER TABLE ns_snapshots REPLICA IDENTITY FULL;
ALTER TABLE ns_sk_entries REPLICA IDENTITY FULL;
ALTER TABLE campaign_nodes REPLICA IDENTITY FULL;
