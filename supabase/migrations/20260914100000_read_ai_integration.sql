-- Read AI meeting note-taker catalog entry (ROA-40, Phase 2).
-- Connected by pasting the ROAS webhook address into Read AI and the Read AI
-- signing key into ROAS; no OAuth, no API key.

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
  'read_ai',
  'read_ai',
  'Read AI',
  'Connect Read AI so meeting reports, transcripts, and action items flow into your brain and Meetings.',
  'api_key',
  true,
  jsonb_build_object('connection_mode', 'pasted_webhook', 'managed_by', 'roas')
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
