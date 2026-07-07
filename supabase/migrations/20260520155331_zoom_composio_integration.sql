-- Zoom (Composio): catalog row + toolkit config

INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'zoom', 'zoom', 'Zoom',
  'Connect Zoom to manage meetings, webinars, and recordings.',
  'oauth2', true,
  jsonb_build_object('managed_by', 'composio')
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO project_composio_toolkit_config (
  integration_id, toolkit_slug, auth_config_id, auth_mode, enabled, metadata
) VALUES (
  'zoom',
  'zoom',
  'ac_kcTr4If6MKdB',
  'managed',
  true,
  jsonb_build_object('execution_mode', 'composio')
)
ON CONFLICT (integration_id) DO UPDATE SET
  toolkit_slug = EXCLUDED.toolkit_slug,
  auth_config_id = EXCLUDED.auth_config_id,
  enabled = EXCLUDED.enabled,
  metadata = EXCLUDED.metadata,
  updated_at = now();
