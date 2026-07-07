-- Brain Cross-Pollination Suggestions
-- After Atlas integrates a Fathom/Fireflies recording into the user brain,
-- a cross-pollination step can suggest relevant campaign brains.
-- Users accept/reject via notifications; accept enqueues a campaign import job.

CREATE TABLE IF NOT EXISTS brain_cross_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  source_job_id UUID NOT NULL REFERENCES brain_import_jobs(id) ON DELETE CASCADE,
  source_job_type TEXT NOT NULL,
  source_title TEXT NOT NULL,
  target_campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_campaign_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  result_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  UNIQUE(source_job_id, target_campaign_id)
);

CREATE INDEX idx_brain_cross_suggestions_user_pending
  ON brain_cross_suggestions(user_id, status, created_at DESC);

ALTER TABLE brain_cross_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cross suggestions"
  ON brain_cross_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cross suggestions"
  ON brain_cross_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE brain_cross_suggestions;
