-- Fathom AI integration catalog entry

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
  'fathom',
  'fathom',
  'Fathom',
  'Connect Fathom AI to sync meeting recordings, transcripts, and action items.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array(
      'public_api'
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
