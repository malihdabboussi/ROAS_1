-- =============================================================================
-- Slack: switch from (orphaned) Composio catalog to native bot-token tools
-- =============================================================================
--
-- Context:
--   * Our only real Slack OAuth flow is the Vibey Dev app (SlackService.getInstallUrl).
--   * Composio still had `ac_lTwP2-pZdStb` registered + 153 SLACK_* capability rows
--     with execution_mode='composio', but 12 of 13 connected users have zero
--     Composio connected_account for Slack → every one of those 153 rows was
--     unreachable for agents at runtime.
--
-- This migration:
--   1. Deletes the 153 orphaned Composio Slack capability rows.
--   2. Flips project_composio_toolkit_config.slack to native mode
--      (metadata.execution_mode='legacy', auth_mode='native', auth_config_id NULL).
--   3. Updates integrations_available.slack.metadata.managed_by from
--      'composio' → 'vibey' to match reality (catalog-only flag, no code branches).
--   4. Seeds 16 new Slack capability rows with execution_mode='legacy' and
--      route_config pointing at the new /api/integrations/slack/* endpoints.
--
-- After this runs, agents can call use_integration with service='slack' +
-- integration_action='SLACK_*'. The legacy dispatcher (artifact-legacy-integrations.service.ts)
-- forwards to the endpoints via route_config, using the Vibey bot token.
-- =============================================================================

-- 1) Delete orphaned Composio Slack capability rows
DELETE FROM integration_capabilities
WHERE integration_id = 'slack'
  AND execution_mode = 'composio';

-- 2) Flip Slack toolkit config to native / legacy execution mode.
--    Keeping the row (rather than deleting) because
--    resolveIntegrationExecutionMode defaults to 'composio' when the row is
--    missing — which would break routing. Explicit 'legacy' is the gate.
-- auth_mode='custom' matches fathom/fireflies/gohighlevel pattern for
-- non-Composio-managed integrations (check constraint allows 'managed'|'custom').
UPDATE project_composio_toolkit_config
SET
  auth_config_id = NULL,
  auth_mode = 'custom',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{execution_mode}',
    '"legacy"'::jsonb
  ),
  updated_at = NOW()
WHERE integration_id = 'slack';

-- 3) Update catalog metadata (no code branches on this today)
UPDATE integrations_available
SET
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{managed_by}',
    '"vibey"'::jsonb
  ),
  updated_at = NOW()
WHERE id = 'slack';

-- 3b) Scrub stale Composio connection pointers from user_integrations.
--     The Composio auth config + all connected accounts have been deleted
--     via the Composio API; keeping these keys would leave dangling refs.
UPDATE user_integrations
SET
  metadata = metadata - 'composio_connected_account_id' - 'composio_toolkit_slug',
  updated_at = NOW()
WHERE integration_id = 'slack'
  AND (metadata ? 'composio_connected_account_id' OR metadata ? 'composio_toolkit_slug');

-- 4) Seed the 16 new native Slack capability rows.
--    route_config matches the SLACK_ROUTES map in
--    packages/api-shared/src/legacy-integration-routes.ts so future
--    syncCapabilities runs stay consistent.
INSERT INTO integration_capabilities (
  integration_id, action_slug, execution_mode, display_name, description,
  parameters, examples, metadata, domains, route_config
)
VALUES
  (
    'slack', 'SLACK_SEARCH_MESSAGES', 'legacy',
    'Search Slack Messages',
    'Search for messages across the Slack workspace. Results are scoped to channels the Vibey bot can see.',
    '{"query":{"type":"string","required":true},"count":{"type":"number"},"sort":{"type":"string"},"sort_dir":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/search-messages","query_remainder":true}'::jsonb
  ),
  (
    'slack', 'SLACK_SEARCH_FILES', 'legacy',
    'Search Slack Files',
    'Search for files uploaded in the Slack workspace. Results are scoped to files the Vibey bot can see.',
    '{"query":{"type":"string","required":true},"count":{"type":"number"},"sort":{"type":"string"},"sort_dir":{"type":"string"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/search-files","query_remainder":true}'::jsonb
  ),
  (
    'slack', 'SLACK_LIST_CHANNELS', 'legacy',
    'List Slack Channels',
    'List public, private, group-DM, and DM conversations visible to the Vibey bot.',
    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/channels"}'::jsonb
  ),
  (
    'slack', 'SLACK_LIST_USERS', 'legacy',
    'List Slack Users',
    'List all members of the Slack workspace.',
    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/users"}'::jsonb
  ),
  (
    'slack', 'SLACK_GET_USER_INFO', 'legacy',
    'Get Slack User Info',
    'Fetch detailed profile for a single Slack user.',
    '{"slack_user_id":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/user-info","query_params":{"slack_user_id":"slack_user_id"}}'::jsonb
  ),
  (
    'slack', 'SLACK_FIND_USER_BY_EMAIL', 'legacy',
    'Find Slack User by Email',
    'Resolve a Slack user by their email address.',
    '{"email":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/user-by-email","query_params":{"email":"email"}}'::jsonb
  ),
  (
    'slack', 'SLACK_SEND_MESSAGE', 'legacy',
    'Send Slack Message',
    'Post a message to a Slack channel or DM. Pass thread_ts to reply in an existing thread.',
    '{"channel_id":{"type":"string","required":true},"text":{"type":"string","required":true},"thread_ts":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/send-message"}'::jsonb
  ),
  (
    'slack', 'SLACK_UPDATE_MESSAGE', 'legacy',
    'Update Slack Message',
    'Edit a previously posted Slack message (must have been posted by the Vibey bot).',
    '{"channel_id":{"type":"string","required":true},"ts":{"type":"string","required":true},"text":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/update-message"}'::jsonb
  ),
  (
    'slack', 'SLACK_DELETE_MESSAGE', 'legacy',
    'Delete Slack Message',
    'Delete a previously posted Slack message (must have been posted by the Vibey bot).',
    '{"channel_id":{"type":"string","required":true},"ts":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/delete-message"}'::jsonb
  ),
  (
    'slack', 'SLACK_GET_CHANNEL_HISTORY', 'legacy',
    'Get Slack Channel History',
    'Fetch recent messages from a Slack channel or DM.',
    '{"channel_id":{"type":"string","required":true},"limit":{"type":"number"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/channel-history","query_remainder":true}'::jsonb
  ),
  (
    'slack', 'SLACK_GET_THREAD_REPLIES', 'legacy',
    'Get Slack Thread Replies',
    'Fetch all replies to a message thread in a channel.',
    '{"channel_id":{"type":"string","required":true},"thread_ts":{"type":"string","required":true},"limit":{"type":"number"},"cursor":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/thread-replies","query_remainder":true}'::jsonb
  ),
  (
    'slack', 'SLACK_ADD_REACTION', 'legacy',
    'Add Slack Reaction',
    'Add an emoji reaction to a message.',
    '{"channel_id":{"type":"string","required":true},"ts":{"type":"string","required":true},"name":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/add-reaction"}'::jsonb
  ),
  (
    'slack', 'SLACK_REMOVE_REACTION', 'legacy',
    'Remove Slack Reaction',
    'Remove an emoji reaction from a message.',
    '{"channel_id":{"type":"string","required":true},"ts":{"type":"string","required":true},"name":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/remove-reaction"}'::jsonb
  ),
  (
    'slack', 'SLACK_OPEN_DM', 'legacy',
    'Open Slack DM',
    'Open (or reuse) a direct-message channel with a Slack user. Returns channel_id.',
    '{"slack_user_id":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/open-dm"}'::jsonb
  ),
  (
    'slack', 'SLACK_UPLOAD_FILE', 'legacy',
    'Upload File to Slack',
    'Upload a file to a Slack channel by providing a public URL. Vibey downloads the URL server-side and uploads to Slack.',
    '{"channel_id":{"type":"string","required":true},"file_url":{"type":"string","required":true},"filename":{"type":"string","required":true},"thread_ts":{"type":"string"}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"POST","path":"/api/integrations/slack/upload-file"}'::jsonb
  ),
  (
    'slack', 'SLACK_GET_FILE_INFO', 'legacy',
    'Get Slack File Info',
    'Fetch metadata for a file uploaded to Slack by file_id.',
    '{"file_id":{"type":"string","required":true}}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, ARRAY['shared']::text[],
    '{"method":"GET","path":"/api/integrations/slack/file-info","query_params":{"file_id":"file_id"}}'::jsonb
  );
