-- Change user_workspaces unique constraint from (user_id) to (user_id, org_id)
-- so each user can have a separate workspace per organization + personal.
-- Since org_id is nullable and NULL != NULL in SQL, we use a unique index
-- with COALESCE to treat NULL as a sentinel value.

ALTER TABLE public.user_workspaces
  DROP CONSTRAINT IF EXISTS user_workspaces_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_workspaces_user_id_org_id_key
  ON public.user_workspaces (user_id, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'));
