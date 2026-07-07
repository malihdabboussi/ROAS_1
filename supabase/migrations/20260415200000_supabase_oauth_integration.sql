-- Seed Supabase into integrations_available
INSERT INTO integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'supabase',
  'supabase',
  'Supabase',
  'Connect your Supabase account to provision databases and auth for your Spaces projects.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array(
      'projects:read', 'projects:write',
      'organizations:read',
      'auth:read', 'auth:write',
      'database:read', 'database:write',
      'secrets:read',
      'rest:read'
    )
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
