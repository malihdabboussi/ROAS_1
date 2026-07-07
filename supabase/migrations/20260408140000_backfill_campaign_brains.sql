-- ============================================================================
-- Backfill: create ns_brains rows for existing campaigns
-- Every campaign needs its own brain row so voice/chat sessions resolve
-- to the campaign brain instead of falling back to the user's personal brain.
-- Idempotent: skips campaigns that already have a brain row.
-- ============================================================================

INSERT INTO ns_brains (owner_id, campaign_id, name, is_default, color, icon, tags, org_id)
SELECT
  c.user_id,
  c.id,
  c.name,
  false,
  '#6366F1',
  'campaign',
  '[]'::jsonb,
  c.org_id
FROM campaigns c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM ns_brains b WHERE b.campaign_id = c.id
  );
