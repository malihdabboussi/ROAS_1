-- ============================================================
-- FIX user_integrations UNIQUE CONSTRAINT FOR ORG SUPPORT
-- Old: UNIQUE(user_id, integration_id) — blocks separate personal + org rows
-- New: partial unique indexes — one per personal, one per org
-- ============================================================

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_id_integration_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_personal_unique
  ON public.user_integrations(user_id, integration_id)
  WHERE org_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_org_unique
  ON public.user_integrations(org_id, integration_id)
  WHERE org_id IS NOT NULL;
