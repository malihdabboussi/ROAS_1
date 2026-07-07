-- ============================================================================
-- Slack Brain Sync Mappings
-- Adds explicit, opt-in Slack channel mappings for periodic brain ingestion.
-- Sender-level routing reuses contact_identifiers; there is intentionally no
-- slack_user_mappings table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_brain_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  slack_channel_id text NOT NULL,
  slack_channel_name text NOT NULL,
  target_kind text NOT NULL,
  target_brain_id uuid REFERENCES ns_brains(id) ON DELETE SET NULL,
  target_campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  cadence text NOT NULL DEFAULT 'daily',
  last_synced_at timestamptz,
  last_message_ts text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_kind IN ('user', 'campaign', 'agent', 'customer')),
  CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  CHECK (
    (target_kind = 'campaign' AND target_campaign_id IS NOT NULL AND target_brain_id IS NULL)
    OR (target_kind IN ('user', 'agent') AND target_brain_id IS NOT NULL AND target_campaign_id IS NULL)
    OR (target_kind = 'customer' AND target_brain_id IS NULL AND target_campaign_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_slack_brain_mappings_destination
  ON slack_brain_mappings (
    slack_team_id,
    slack_channel_id,
    target_kind,
    COALESCE(target_campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(target_brain_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS idx_slack_brain_mappings_due
  ON slack_brain_mappings (enabled, last_synced_at, cadence, created_at);

CREATE INDEX IF NOT EXISTS idx_slack_brain_mappings_user_created
  ON slack_brain_mappings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_brain_mappings_org_created
  ON slack_brain_mappings (org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

ALTER TABLE slack_brain_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slack_brain_mappings_read ON slack_brain_mappings;
CREATE POLICY slack_brain_mappings_read ON slack_brain_mappings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

DROP POLICY IF EXISTS slack_brain_mappings_insert ON slack_brain_mappings;
CREATE POLICY slack_brain_mappings_insert ON slack_brain_mappings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

DROP POLICY IF EXISTS slack_brain_mappings_update ON slack_brain_mappings;
CREATE POLICY slack_brain_mappings_update ON slack_brain_mappings
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

DROP POLICY IF EXISTS slack_brain_mappings_delete ON slack_brain_mappings;
CREATE POLICY slack_brain_mappings_delete ON slack_brain_mappings
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_slack_brain_mappings'
  ) THEN
    CREATE TRIGGER set_updated_at_slack_brain_mappings
      BEFORE UPDATE ON slack_brain_mappings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
