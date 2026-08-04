-- Make Slack retrieval coverage explicit for Pixel and teach it not to treat a
-- bounded zero-result search as proof that the requested message is absent.

UPDATE public.integration_capabilities
SET
  description = 'Search Slack with native full search when authorized and bounded historical channel retrieval otherwise. Named-channel fallback searches up to 120 days, expands threads, and returns complete or partial coverage. A partial zero-match result is not proof that a message is absent.',
  updated_at = now()
WHERE integration_id = 'slack'
  AND action_slug = 'SLACK_SEARCH_MESSAGES'
  AND execution_mode = 'legacy';

UPDATE public.integration_capabilities
SET
  description = 'Fetch a date-bounded, cursor-paginated page of messages with permalinks and canonical Slack channel identity. Continue while coverage.has_more is true. Treat the returned channel id/name as authoritative.',
  parameters = parameters || jsonb_build_object(
    'oldest', jsonb_build_object('type', 'string'),
    'latest', jsonb_build_object('type', 'string'),
    'cursor', jsonb_build_object('type', 'string')
  ),
  updated_at = now()
WHERE integration_id = 'slack'
  AND action_slug = 'SLACK_GET_CHANNEL_HISTORY'
  AND execution_mode = 'legacy';

DO $$
DECLARE
  tools_row record;
  anchor text := '- Treat an explicit Slack channel mention or channel ID as authoritative context.';
  search_rule text := '- For Slack source retrieval, use the named channel plus short query variants for the artifact, topic, sender, and likely URL terms. Inspect the returned search coverage. A partial search with zero matches is not evidence that the message is absent; retry with a narrower channel query or broader terms before asking the user.';
  channel_rule text := '- Treat an explicit Slack channel mention or channel ID as authoritative context. Resolve its canonical name with Slack channel history or channel listing before mapping the client. Never infer a different client from message content, nearby campaign context, or a previous conversation. If the channel cannot be verified, say so and ask one focused question instead of returning another client''s data.';
  next_content text;
  insert_at int;
BEGIN
  SELECT id, content
  INTO tools_row
  FROM public.agent_definitions
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'vibey'
    AND file_name = 'TOOLS.md'
  LIMIT 1;

  IF tools_row.id IS NULL THEN
    RAISE EXCEPTION 'Global Pixel TOOLS.md definition was not found';
  END IF;

  next_content := tools_row.content;
  IF next_content NOT LIKE '%A partial search with zero matches is not evidence%' THEN
    IF position(anchor in next_content) > 0 THEN
      next_content := replace(next_content, anchor, search_rule || E'\n' || anchor);
    ELSIF position(E'\n## ' in next_content) > 0 THEN
      -- Prod TOOLS.md may not include the platform-tools anchor; insert a durable section.
      insert_at := position(E'\n## ' in substring(next_content from position('## Purpose' in next_content) + 1));
      IF insert_at > 0 THEN
        insert_at := position('## Purpose' in next_content) + insert_at;
        next_content :=
          substring(next_content from 1 for insert_at - 1)
          || E'\n## Slack source retrieval\n\n'
          || search_rule
          || E'\n'
          || channel_rule
          || E'\n'
          || substring(next_content from insert_at);
      ELSE
        next_content :=
          next_content
          || E'\n\n## Slack source retrieval\n\n'
          || search_rule
          || E'\n'
          || channel_rule
          || E'\n';
      END IF;
    ELSE
      next_content :=
        next_content
        || E'\n\n## Slack source retrieval\n\n'
        || search_rule
        || E'\n'
        || channel_rule
        || E'\n';
    END IF;
  END IF;

  UPDATE public.agent_definitions
  SET content = next_content, updated_at = now()
  WHERE id = tools_row.id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE id = tools_row.id
      AND content LIKE '%A partial search with zero matches is not evidence%'
      AND content LIKE '%retry with a narrower channel query or broader terms%'
  ) THEN
    RAISE EXCEPTION 'Pixel Slack search coverage guidance was not persisted';
  END IF;
END;
$$;
