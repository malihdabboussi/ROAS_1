-- Google Drive integration catalog entry

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
  'google_drive',
  'google_drive',
  'Google Drive',
  'Connect Google Drive to browse, upload, and sync files with your campaigns.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array(
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
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
