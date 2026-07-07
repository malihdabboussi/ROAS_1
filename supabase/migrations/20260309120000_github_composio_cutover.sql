-- Cut GitHub over to Composio execution mode and remove stale Google Drive legacy capabilities.

update public.project_composio_toolkit_config
set
  metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{execution_mode}', '"composio"'::jsonb, true),
  updated_at = now()
where integration_id = 'github';

delete from public.integration_capabilities
where integration_id = 'google_drive'
  and execution_mode = 'legacy';
