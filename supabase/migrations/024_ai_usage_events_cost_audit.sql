-- Add cost audit fields to AI usage events
-- Allows differentiating OpenRouter generation API cost vs local calculation.

ALTER TABLE ai_usage_events
  ADD COLUMN cost_source TEXT;

ALTER TABLE ai_usage_events
  ADD COLUMN generation_ids JSONB DEFAULT '[]'::jsonb;

