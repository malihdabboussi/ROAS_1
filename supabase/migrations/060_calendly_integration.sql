-- Calendly integration catalog entry

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
  'calendly',
  'calendly',
  'Calendly',
  'Connect Calendly to manage event types, schedule meetings, and embed scheduling widgets in funnels.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array('default')
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
