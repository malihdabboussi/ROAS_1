-- Allow Pixel to open multi-person DMs and keep the DB-backed action contract
-- aligned with the API catalog.
UPDATE integrations_available
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{scopes}',
  CASE
    WHEN coalesce(metadata->'scopes', '[]'::jsonb) ? 'mpim:write'
      THEN coalesce(metadata->'scopes', '[]'::jsonb)
    ELSE coalesce(metadata->'scopes', '[]'::jsonb) || '["mpim:write"]'::jsonb
  END
),
updated_at = now()
WHERE id = 'slack';

UPDATE integration_capabilities
SET
  display_name = 'Open Slack DM or Group DM',
  description = 'Open or reuse a Slack DM. Use slack_user_id for one recipient. Use slack_user_ids for a group DM; when the user asks for a group chat "with me", include the requesting Slack user ID plus every named recipient. Returns the channel ID, conversation type, and friendly participant names. Refer to people by the returned names, never raw Slack IDs.',
  parameters = '{
    "slack_user_id": {"type": "string"},
    "slack_user_ids": {"type": "array"}
  }'::jsonb,
  examples = '[
    {"slack_user_id": "U01234567"},
    {"slack_user_ids": ["U01234567", "U07654321"]}
  ]'::jsonb,
  updated_at = now()
WHERE integration_id = 'slack'
  AND action_slug = 'SLACK_OPEN_DM';
