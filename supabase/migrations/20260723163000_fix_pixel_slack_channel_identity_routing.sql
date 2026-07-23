-- Anchor Pixel's Slack reasoning to canonical channel identity and prevent a
-- failed ROAS portal fulfillment request from silently changing work types.

UPDATE public.integration_capabilities
SET
  description = 'Fetch recent messages plus the canonical Slack channel identity. Treat the returned channel id/name as authoritative; never infer a different channel or client from message content.',
  updated_at = now()
WHERE integration_id = 'slack'
  AND action_slug = 'SLACK_GET_CHANNEL_HISTORY'
  AND execution_mode = 'legacy';

DO $$
DECLARE
  tools_row record;
  anchor text := '- A named client or campaign overrides ambient campaign context.';
  channel_rule text := '- Treat an explicit Slack channel mention or channel ID as authoritative context. Resolve its canonical name with Slack channel history or channel listing before mapping the client. Never infer a different client from message content, nearby campaign context, or a previous conversation. If the channel cannot be verified, say so and ask one focused question instead of returning another client''s data.';
  portal_rule text := '- In a funnel-fulfillment request, "the portal" means the ROAS portal fulfillment workflow. Do not interpret it as permission for Pixel to generate a native ROAS platform funnel. Use native `create_funnel` only when the user explicitly asks Pixel to build the funnel itself in the ROAS platform or funnel builder.';
  failure_rule text := '- If ROAS portal fulfillment fails, stop and report the plain-language blocker. Do not silently fall back to `create_task`, `create_funnel`, another assignee, or another client.';
  next_content text;
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
  IF next_content NOT LIKE '%Treat an explicit Slack channel mention or channel ID as authoritative%' THEN
    next_content := replace(next_content, anchor, anchor || E'\n' || channel_rule);
  END IF;
  IF next_content NOT LIKE '%"the portal" means the ROAS portal fulfillment workflow%' THEN
    next_content := replace(
      next_content,
      '- A named human owner of Page Grader fulfillment',
      portal_rule || E'\n- A named human owner of Page Grader fulfillment'
    );
  END IF;
  IF next_content NOT LIKE '%If ROAS portal fulfillment fails, stop%' THEN
    next_content := replace(
      next_content,
      '- Do not tell the user work was assigned',
      failure_rule || E'\n- Do not tell the user work was assigned'
    );
  END IF;

  UPDATE public.agent_definitions
  SET content = next_content, updated_at = now()
  WHERE id = tools_row.id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE id = tools_row.id
      AND content LIKE '%Treat an explicit Slack channel mention or channel ID as authoritative%'
      AND content LIKE '%Never infer a different client from message content%'
      AND content LIKE '%"the portal" means the ROAS portal fulfillment workflow%'
      AND content LIKE '%If ROAS portal fulfillment fails, stop%'
  ) THEN
    RAISE EXCEPTION 'Pixel canonical Slack channel routing policy was not persisted';
  END IF;
END;
$$;

UPDATE public.agent_skills
SET
  markdown_content = markdown_content || $rules$

## Fulfillment boundary

In a funnel-fulfillment request, "the portal" means the ROAS portal
fulfillment workflow. Do not generate a native ROAS platform funnel unless
the user explicitly asks the agent to build it in the ROAS platform funnel
builder.

If ROAS portal fulfillment fails, stop. Do not silently replace it with a
generic ROAS task, a native funnel, another assignee, or another client.
$rules$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Fulfillment boundary%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%If ROAS portal fulfillment fails, stop%'
  ) <> 2 THEN
    RAISE EXCEPTION 'ROAS portal fulfillment boundary was not persisted';
  END IF;
END;
$$;
