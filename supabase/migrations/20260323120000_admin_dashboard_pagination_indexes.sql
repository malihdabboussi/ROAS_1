-- Indexes for admin dashboard paginated queries (ORDER BY created_at, id / updated_at, id)
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created_id ON public.ai_usage_events (created_at, id);
CREATE INDEX IF NOT EXISTS idx_mission_subtasks_updated_id ON public.mission_subtasks (updated_at, id);
