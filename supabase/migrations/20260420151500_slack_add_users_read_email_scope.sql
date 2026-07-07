-- Keep DB catalog metadata aligned with Slack OAuth scopes requested in app code.
UPDATE integrations_available
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{scopes}',
  '[
    "app_mentions:read",
    "assistant:write",
    "bookmarks:read",
    "bookmarks:write",
    "channels:history",
    "channels:read",
    "chat:write",
    "chat:write.public",
    "commands",
    "files:read",
    "files:write",
    "groups:history",
    "groups:read",
    "im:history",
    "im:read",
    "im:write",
    "links:read",
    "links:write",
    "mpim:history",
    "mpim:read",
    "reactions:read",
    "reactions:write",
    "remote_files:read",
    "search:read.files",
    "search:read.im",
    "search:read.mpim",
    "search:read.private",
    "search:read.public",
    "users:read",
    "users:read.email"
  ]'::jsonb
),
updated_at = now()
WHERE id = 'slack';
