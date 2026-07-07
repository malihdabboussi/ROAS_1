-- Integration scope modes:
-- - personal (user-owned, can exist in personal account and inside org context)
-- - org_shared (shared by org, admin/owner managed)
--
-- This migration enables:
-- - multiple org-shared connections for the same integration
-- - one org-personal connection per user+integration inside an org
-- - one default org-shared connection per org+integration

ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS scope_mode text;

ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS connection_label text;

UPDATE public.user_integrations
SET scope_mode = CASE WHEN org_id IS NULL THEN 'personal' ELSE 'org_shared' END
WHERE scope_mode IS NULL;

ALTER TABLE public.user_integrations
  ALTER COLUMN scope_mode SET NOT NULL;

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_scope_mode_check;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_scope_mode_check
  CHECK (scope_mode IN ('personal', 'org_shared'));

DROP INDEX IF EXISTS idx_user_integrations_org_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_org_personal_unique
  ON public.user_integrations(org_id, user_id, integration_id)
  WHERE org_id IS NOT NULL AND scope_mode = 'personal';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_org_shared_default_unique
  ON public.user_integrations(org_id, integration_id)
  WHERE org_id IS NOT NULL AND scope_mode = 'org_shared' AND is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_integrations_org_scope_lookup
  ON public.user_integrations(org_id, integration_id, scope_mode, updated_at DESC)
  WHERE org_id IS NOT NULL;

WITH ranked_org_shared AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY org_id, integration_id
      ORDER BY
        CASE WHEN connected_at IS NULL THEN 1 ELSE 0 END,
        connected_at DESC,
        created_at ASC
    ) AS rank_in_group
  FROM public.user_integrations
  WHERE org_id IS NOT NULL
    AND scope_mode = 'org_shared'
)
UPDATE public.user_integrations ui
SET is_default = (ros.rank_in_group = 1)
FROM ranked_org_shared ros
WHERE ui.id = ros.id;

DROP POLICY IF EXISTS "Users can manage own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Org members can read org integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Service role full access user_integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users manage personal integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Org members read org integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users manage org personal integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Org admins manage org shared integrations" ON public.user_integrations;

CREATE POLICY "Users manage personal integrations"
  ON public.user_integrations
  FOR ALL
  USING (
    auth.uid() = user_id
    AND org_id IS NULL
    AND scope_mode = 'personal'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND org_id IS NULL
    AND scope_mode = 'personal'
  );

CREATE POLICY "Org members read org integrations"
  ON public.user_integrations
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Users manage org personal integrations"
  ON public.user_integrations
  FOR ALL
  USING (
    org_id IS NOT NULL
    AND scope_mode = 'personal'
    AND auth.uid() = user_id
    AND public.is_org_member(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'personal'
    AND auth.uid() = user_id
    AND public.is_org_member(org_id)
  );

CREATE POLICY "Org admins manage org shared integrations"
  ON public.user_integrations
  FOR ALL
  USING (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'
    AND public.is_org_admin_or_owner(org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'
    AND public.is_org_admin_or_owner(org_id)
  );

CREATE POLICY "Service role full access user_integrations"
  ON public.user_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
