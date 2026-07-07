ALTER TABLE ai_usage_events
  ADD COLUMN cost_source TEXT;

ALTER TABLE ai_usage_events
  ADD COLUMN generation_ids JSONB DEFAULT '[]'::jsonb;
;
