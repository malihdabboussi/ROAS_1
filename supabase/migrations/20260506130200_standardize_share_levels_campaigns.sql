-- ============================================================
-- Standardize org_campaign_permissions.permission to canonical
-- (admin | edit | view). Existing values ('view','edit') are
-- already a subset; widen the CHECK only.
-- ============================================================

BEGIN;

ALTER TABLE public.org_campaign_permissions
  DROP CONSTRAINT IF EXISTS org_campaign_permissions_permission_check;

ALTER TABLE public.org_campaign_permissions
  ADD CONSTRAINT org_campaign_permissions_permission_check
  CHECK (permission IN ('admin', 'edit', 'view'));

COMMIT;
