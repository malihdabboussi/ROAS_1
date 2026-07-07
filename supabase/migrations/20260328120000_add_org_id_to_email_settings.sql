-- Add org-scoped email settings while keeping personal-mode compatibility.
-- This migration is intentionally additive and does not drop existing user-scoped behavior.

BEGIN;

ALTER TABLE public.email_settings
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_email_settings_org_id
  ON public.email_settings (org_id);

-- Keep one row per (user, org) combination.
-- org_id NULL rows remain valid for personal mode.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_settings_user_org
  ON public.email_settings (user_id, org_id);

-- Preserve prior policy if present.
DROP POLICY IF EXISTS "Users can manage own email settings" ON public.email_settings;

-- Personal mode + org mode policy.
CREATE POLICY "Users and org members can manage email settings"
  ON public.email_settings
  FOR ALL
  TO authenticated
  USING (
    (org_id IS NULL AND user_id = auth.uid())
    OR
    (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    (org_id IS NULL AND user_id = auth.uid())
    OR
    (org_id IS NOT NULL AND is_org_member(org_id))
  );

COMMIT;
