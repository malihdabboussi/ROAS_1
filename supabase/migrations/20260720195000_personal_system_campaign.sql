-- One Personal system campaign per personal account (org_id IS NULL).
-- Home always reads this campaign; it is not provisioned per org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_single_personal_per_user
  ON public.campaigns (user_id)
  WHERE coalesce(config->>'system_kind', '') = 'personal'
    AND org_id IS NULL
    AND coalesce(status, '') <> 'archived'
    AND deleted_at IS NULL;
