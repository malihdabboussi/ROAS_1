-- Allow multiple personal connections per user+integration (e.g. two Google Calendar accounts).
-- Keep at most one default personal connection per user+integration.

DROP INDEX IF EXISTS idx_user_integrations_personal_unique;
DROP INDEX IF EXISTS idx_user_integrations_org_personal_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_personal_default_unique
  ON public.user_integrations(user_id, integration_id)
  WHERE org_id IS NULL AND scope_mode = 'personal' AND is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_org_personal_default_unique
  ON public.user_integrations(org_id, user_id, integration_id)
  WHERE org_id IS NOT NULL AND scope_mode = 'personal' AND is_default = true;
