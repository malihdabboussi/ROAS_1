-- ============================================================
-- SUPERADMIN ROLE + IMPERSONATION AUDIT LOG
-- Adds 'superadmin' to user_profiles.role, creates the
-- superadmin_audit_log table (every impersonation session is
-- recorded), and assigns superadmin to the platform owner.
-- ============================================================

-- 1. Expand user_profiles.role CHECK to include 'superadmin'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'power', 'admin', 'enterprise', 'superadmin'));

-- 2. Audit log for superadmin impersonation sessions
CREATE TABLE IF NOT EXISTS superadmin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('impersonation_start', 'impersonation_stop')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_log_superadmin
  ON superadmin_audit_log (superadmin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_log_target
  ON superadmin_audit_log (target_user_id, created_at DESC);

-- 3. RLS: backend-only access (service role); no end-user access
ALTER TABLE superadmin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access superadmin_audit_log" ON superadmin_audit_log;
CREATE POLICY "Service role full access superadmin_audit_log"
  ON superadmin_audit_log FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- NOTE: the superadmin role grant itself is a data operation run separately
-- (UPDATE user_profiles SET role = 'superadmin' WHERE id = ...) — confirmed
-- per-account with the platform owner, never part of schema migrations.
