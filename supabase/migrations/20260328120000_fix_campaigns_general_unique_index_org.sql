-- Fix: allow one General campaign per (user_id, org_id) combination.
-- Previously UNIQUE(user_id) which blocked org-scoped General campaigns
-- when a personal one already existed.

DROP INDEX IF EXISTS idx_campaigns_single_general_per_user;
CREATE UNIQUE INDEX idx_campaigns_single_general_per_user
  ON campaigns(user_id, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'))
  WHERE COALESCE(config->>'system_kind', '') = 'general' AND status <> 'archived';
