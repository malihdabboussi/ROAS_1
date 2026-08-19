-- SLACK_SEARCH_MESSAGES gains client scoping (Client Context Bundle):
-- client_id / client_name / channel_ids restrict retrieval to the client's
-- mapped Slack channels and return client_context + per-channel coverage.

UPDATE public.integration_capabilities
SET
  description = 'Search Slack with native full search when authorized and bounded historical channel retrieval otherwise. For a client question pass client_id (Portal client id) or client_name, or channel_ids: the search is then scoped to that client''s mapped channels and returns client_context plus per-channel coverage — always name the channel searched. Named-channel fallback searches up to 120 days, expands threads, and returns complete or partial coverage. A partial zero-match result is not proof that a message is absent.',
  parameters = parameters || jsonb_build_object(
    'client_id', jsonb_build_object('type', 'string'),
    'client_name', jsonb_build_object('type', 'string'),
    'channel_ids', jsonb_build_object('type', 'string')
  ),
  updated_at = now()
WHERE integration_id = 'slack'
  AND action_slug = 'SLACK_SEARCH_MESSAGES'
  AND execution_mode = 'legacy';
