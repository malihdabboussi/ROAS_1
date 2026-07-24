INSERT INTO public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'higgsfield',
  'higgsfield',
  'Higgsfield',
  'Connect Higgsfield so ROAS agents and missions can create and manage video assets.',
  'oauth2',
  true,
  jsonb_build_object(
    'category', 'automation',
    'execution_mode', 'native_mcp',
    'server_url', 'https://mcp.higgsfield.ai/mcp',
    'token_storage', 'vault_secrets'
  )
)
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();
