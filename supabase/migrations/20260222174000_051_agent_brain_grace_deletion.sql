-- 051: Agent brain cancellation grace-period fields

ALTER TABLE ns_brains
ADD COLUMN IF NOT EXISTS pending_deletion_at timestamptz,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_ns_brains_pending_deletion
  ON ns_brains (pending_deletion_at)
  WHERE pending_deletion_at IS NOT NULL;
