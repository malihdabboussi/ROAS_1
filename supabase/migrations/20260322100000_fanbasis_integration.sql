-- Add FanBasis as a legacy API-key integration

INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'fanbasis',
  'fanbasis',
  'FanBasis',
  'Connect FanBasis to manage products, checkout sessions, subscriptions, customers, discount codes, and transactions.',
  'api_key',
  true,
  '{"category": "payments", "website": "https://www.fanbasis.com"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata;

INSERT INTO project_composio_toolkit_config (integration_id, toolkit_slug, auth_config_id, enabled, auth_mode, metadata)
VALUES (
  'fanbasis',
  'fanbasis',
  NULL,
  true,
  'custom',
  '{"execution_mode": "legacy"}'::jsonb
)
ON CONFLICT (integration_id) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  enabled = EXCLUDED.enabled;
