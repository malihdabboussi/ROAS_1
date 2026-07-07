-- PostgREST/.upsert(..., { onConflict: 'user_id,org_id' }) emits ON CONFLICT (user_id, org_id).
-- Postgres only accepts that when a unique index exists on exactly those columns.
-- The expression index from 20260328170000_workspace_per_org_unique_constraint.sql
-- (user_id, COALESCE(org_id, ...)) does not match inference for (user_id, org_id).

DROP INDEX IF EXISTS public.user_workspaces_user_id_org_id_key;

ALTER TABLE public.user_workspaces
  DROP CONSTRAINT IF EXISTS user_workspaces_user_id_key;

ALTER TABLE public.user_workspaces
  ADD CONSTRAINT user_workspaces_user_id_org_id_key
  UNIQUE NULLS NOT DISTINCT (user_id, org_id);
