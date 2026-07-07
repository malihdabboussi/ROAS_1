-- Standardize provider execution mode for integrations routing.
-- The router treats providers absent from this table as legacy by default.

update public.project_composio_toolkit_config
set
  metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{execution_mode}', '"composio"'::jsonb, true),
  updated_at = now();

update public.project_composio_toolkit_config
set
  metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{execution_mode}', '"legacy"'::jsonb, true),
  updated_at = now()
where integration_id in ('github');
