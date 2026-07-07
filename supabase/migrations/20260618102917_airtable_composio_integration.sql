-- Airtable (Composio): catalog row + toolkit config

insert into public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
values (
  'airtable',
  'airtable',
  'Airtable',
  'Connect Airtable to manage bases, tables, records, comments, fields, and attachments.',
  'oauth2',
  true,
  jsonb_build_object(
    'managed_by', 'composio',
    'scopes', jsonb_build_array(
      'data.records:read',
      'data.records:write',
      'data.recordComments:read',
      'data.recordComments:write',
      'schema.bases:read',
      'schema.bases:write',
      'user.email:read'
    )
  )
)
on conflict (id) do update set
  provider = excluded.provider,
  name = excluded.name,
  description = excluded.description,
  auth_type = excluded.auth_type,
  is_available = excluded.is_available,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
values (
  'airtable',
  'airtable',
  'ac_-L71Mx-wI2vT',
  'managed',
  true,
  jsonb_build_object(
    'execution_mode', 'composio',
    'scopes', jsonb_build_array(
      'data.records:read',
      'data.records:write',
      'data.recordComments:read',
      'data.recordComments:write',
      'schema.bases:read',
      'schema.bases:write',
      'user.email:read'
    )
  )
)
on conflict (integration_id) do update set
  toolkit_slug = excluded.toolkit_slug,
  auth_config_id = excluded.auth_config_id,
  auth_mode = excluded.auth_mode,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();
