-- Seed integrations_available catalog rows required by Composio-backed providers.
-- This prevents FK violations on user_integrations.integration_id.

INSERT INTO integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES
  (
    'slack',
    'slack',
    'Slack',
    'Connect Slack so agents can read and send messages in channels and DMs.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'linkedin',
    'linkedin',
    'LinkedIn',
    'Connect LinkedIn to read profile/page data and publish social content.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'instagram',
    'instagram',
    'Instagram',
    'Connect Instagram to manage posting workflows and social insights.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'youtube',
    'youtube',
    'YouTube',
    'Connect YouTube to read channel/video data and run supported publish actions.',
    'oauth2',
    true,
    jsonb_build_object('managed_by', 'composio')
  ),
  (
    'twitter',
    'twitter',
    'X (Twitter)',
    'Connect X (Twitter) for social posting and analytics once custom auth is enabled.',
    'oauth2',
    false,
    jsonb_build_object('managed_by', 'composio', 'reason', 'custom_auth_required')
  ),
  (
    'tiktok',
    'tiktok',
    'TikTok',
    'Connect TikTok for social posting and analytics once custom auth is enabled.',
    'oauth2',
    false,
    jsonb_build_object('managed_by', 'composio', 'reason', 'custom_auth_required')
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
